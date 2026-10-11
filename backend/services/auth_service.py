import functools
import logging
import urllib.request
import json
import jwt
from flask import request, jsonify, g, current_app, has_app_context
from backend.config import Config
from backend.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

def _get_config_val(key, default=None):
    if has_app_context() and key in current_app.config:
        val = current_app.config[key]
        if val is not None and val != "":
            return val
    return getattr(Config, key, default)

class AuthService:
    @staticmethod
    def decode_token(token: str) -> dict:
        """
        Server-side validation of JWT tokens.
        Strictly verifies signature, issuer, expiration, and extracts claims.
        Never merely decodes without cryptographic or authoritative verification.
        """
        if not token:
            raise ValueError("Token is required")

        is_testing = _get_config_val("TESTING", False)
        use_mock = _get_config_val("USE_MOCK_DB", False)

        # 1. Allow test tokens strictly in Testing/Mock mode for unit test suite
        if (is_testing or use_mock) and token.startswith("test-token-"):
            raw = token[len("test-token-"):]
            if raw.startswith("email:"):
                parts = raw.split(":")
                email = parts[1] if len(parts) > 1 else "test@example.com"
                user_id = parts[2] if len(parts) > 2 else "44444444-4444-4444-4444-444444444444"
                role = parts[3] if len(parts) > 3 else "user"
                return {
                    "sub": user_id,
                    "email": email,
                    "role": role,
                    "user_metadata": {"full_name": email.split("@")[0]}
                }
            if raw.endswith("-admin"):
                role = "admin"
                user_id = raw[:-6]
            elif raw.endswith("-user"):
                role = "user"
                user_id = raw[:-5]
            elif raw.endswith("-member"):
                role = "user"
                user_id = raw[:-7]
            else:
                user_id = raw
                role = "user"

            user_id = user_id or "11111111-1111-1111-1111-111111111111"
            return {
                "sub": user_id,
                "email": f"user-{user_id[:8]}@taskflow.dev",
                "role": role,
                "user_metadata": {"full_name": f"User {user_id[:8]}"}
            }

        jwt_secret = _get_config_val("SUPABASE_JWT_SECRET")
        jwt_issuer = _get_config_val("SUPABASE_JWT_ISSUER")
        supabase_url = _get_config_val("SUPABASE_URL")
        anon_key = _get_config_val("SUPABASE_ANON_KEY")
        service_key = _get_config_val("SUPABASE_SERVICE_ROLE_KEY")

        # 2. Cryptographic signature verification using SUPABASE_JWT_SECRET (HS256)
        if jwt_secret:
            try:
                decode_options = {
                    "verify_exp": True,
                    "verify_signature": True,
                    "require": ["exp", "sub"]
                }
                decode_kwargs = {
                    "algorithms": ["HS256"],
                    "options": decode_options
                }
                if jwt_issuer:
                    decode_kwargs["issuer"] = jwt_issuer

                decoded = jwt.decode(
                    token,
                    jwt_secret,
                    **decode_kwargs
                )
                return decoded
            except jwt.ExpiredSignatureError:
                raise ValueError("Session token has expired")
            except jwt.InvalidTokenError as e:
                raise ValueError(f"Invalid authentication token: {str(e)}")

        # 3. Live verification with Supabase Auth API
        if supabase_url:
            # First attempt through official python supabase client if initialized
            supabase = get_supabase_client()
            if hasattr(supabase, "auth") and hasattr(supabase.auth, "get_user"):
                try:
                    user_res = supabase.auth.get_user(token)
                    if user_res and user_res.user:
                        u = user_res.user
                        return {
                            "sub": str(u.id),
                            "email": u.email,
                            "role": u.role or "member",
                            "user_metadata": u.user_metadata or {}
                        }
                except Exception as e:
                    logger.warning("Supabase SDK get_user validation failed: %s", e)

            # Authoritative HTTP verification directly with Supabase Auth endpoint
            try:
                auth_url = f"{supabase_url.rstrip('/')}/auth/v1/user"
                req = urllib.request.Request(auth_url)
                req.add_header("Authorization", f"Bearer {token}")
                api_key = anon_key or service_key
                if api_key:
                    req.add_header("apikey", api_key)

                with urllib.request.urlopen(req, timeout=5) as response:
                    if response.status == 200:
                        user_data = json.loads(response.read().decode())
                        return {
                            "sub": str(user_data["id"]),
                            "email": user_data.get("email", ""),
                            "role": user_data.get("role", "member"),
                            "user_metadata": user_data.get("user_metadata", {})
                        }
            except urllib.error.HTTPError as e:
                if e.code in (401, 403):
                    raise ValueError("Session token is invalid or has expired")
                raise ValueError(f"Supabase auth verification failed with status {e.code}")
            except Exception as e:
                logger.error("Supabase endpoint auth error: %s", e)
                raise ValueError("Could not contact authentication provider")

        # 4. If neither Secret nor Live Supabase is configured, reject unverified tokens
        raise ValueError("Server-side token verification could not be completed. Missing verification keys.")

    @classmethod
    def get_authenticated_user(cls) -> dict:
        """
        Extracts and cryptographically verifies user from Authorization header.
        Guarantees that user UUID is derived exclusively from verified token claims.
        Synchronizes user with database profiles table to prevent identity spoofing.
        """
        auth_header = request.headers.get("Authorization", "")
        if not auth_header:
            raise PermissionError("Authorization header is missing")

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise PermissionError("Authorization header must be formatted as 'Bearer <token>'")

        token = parts[1]
        claims = cls.decode_token(token)

        user_id = claims.get("sub")
        if not user_id:
            raise PermissionError("Token claims missing subject identifier ('sub')")

        email = claims.get("email", "")
        user_meta = claims.get("user_metadata", {})
        full_name = (
            user_meta.get("full_name")
            or user_meta.get("name")
            or (email.split("@")[0] if email else "User")
        )
        avatar_url = user_meta.get("avatar_url") or user_meta.get("picture", "")
        initial_role = claims.get("role", "member")

        # Check for authoritative designated primary admin
        admin_emails = [e.lower() for e in _get_config_val("ADMIN_EMAILS", ["yeswanthvarma684280@gmail.com"])]
        is_designated_admin = bool(email and email.lower() in admin_emails)

        # Verify or sync profile in database
        supabase = get_supabase_client()
        role = "user"
        reminder_preference = True
        is_testing = _get_config_val("TESTING", False)
        use_mock = _get_config_val("USE_MOCK_DB", False)

        try:
            prof_res = supabase.table("profiles").select("*").eq("id", str(user_id)).execute()
            if prof_res.data and len(prof_res.data) > 0:
                profile = prof_res.data[0]
                db_role = profile.get("role")
                if is_designated_admin and db_role != "admin":
                    try:
                        supabase.table("profiles").update({
                            "role": "admin",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }).eq("id", str(user_id)).execute()
                        db_role = "admin"
                    except Exception as err:
                        logger.warning("Could not auto-promote designated admin profile in DB: %s", err)

                role = "admin" if (db_role == "admin" or is_designated_admin) else "user"
                full_name = profile.get("full_name") or full_name
                avatar_url = profile.get("avatar_url") or avatar_url
                reminder_preference = profile.get("reminder_preference", True)
            else:
                # Every new Google-authenticated account strictly defaults to 'user' role
                # EXCEPT the designated primary administrator (yeswanthvarma684280@gmail.com)
                # or mock test-token fixtures in testing/mock mode
                test_override_admin = (
                    (is_testing or use_mock)
                    and token.startswith("test-token-")
                    and token.endswith("-admin")
                )
                initial_role = "admin" if (is_designated_admin or test_override_admin) else "user"

                new_profile = {
                    "id": str(user_id),
                    "email": email,
                    "full_name": full_name,
                    "avatar_url": avatar_url,
                    "role": initial_role,
                    "reminder_preference": True,
                }
                ins_res = supabase.table("profiles").insert(new_profile).execute()
                if ins_res.data and len(ins_res.data) > 0:
                    created = ins_res.data[0]
                    role = "admin" if created.get("role") == "admin" else "user"
                else:
                    role = initial_role
        except Exception as e:
            logger.warning("Could not sync profile in database: %s", e)
            role = "admin" if is_designated_admin else "user"

        return {
            "id": str(user_id),
            "email": email,
            "role": "admin" if role == "admin" else "user",
            "full_name": full_name,
            "avatar_url": avatar_url,
            "reminder_preference": reminder_preference
        }

def require_auth(f):
    """
    Decorator for endpoints requiring user authentication.
    Injects request.current_user and rejects unauthenticated requests with HTTP 401.
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            current_user = AuthService.get_authenticated_user()
            request.current_user = current_user
            g.current_user = current_user
        except PermissionError as e:
            return jsonify({
                "error": "Unauthorized",
                "message": str(e),
                "code": "AUTH_REQUIRED"
            }), 401
        except ValueError as e:
            return jsonify({
                "error": "Invalid Token",
                "message": str(e),
                "code": "TOKEN_INVALID"
            }), 401
        except Exception as e:
            logger.error("Unexpected authentication error: %s", e)
            return jsonify({
                "error": "Authentication Failed",
                "message": "Could not verify credentials",
                "code": "AUTH_FAILED"
            }), 401

        return f(*args, **kwargs)
    return decorated_function

def require_role(*allowed_roles):
    """
    Decorator restricting endpoint to specific user roles.
    Rejects unauthorized access with HTTP 403.
    """
    def decorator(f):
        @functools.wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            user = request.current_user
            if user.get("role") not in allowed_roles:
                return jsonify({
                    "error": "Forbidden",
                    "message": f"Action requires one of the following roles: {', '.join(allowed_roles)}",
                    "code": "INSUFFICIENT_PERMISSIONS"
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
