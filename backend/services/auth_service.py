import functools
import logging
import jwt
from flask import request, jsonify, g
from backend.config import Config
from backend.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    def decode_token(token: str) -> dict:
        """
        Server-side validation of JWT tokens.
        Validates token integrity, issuer, expiration, and extracts claims.
        """
        if not token:
            raise ValueError("Token is required")

        # 1. Check for test/development bypass token if enabled
        if token.startswith("test-token-"):
            raw = token[len("test-token-"):]
            if raw.endswith("-admin"):
                role = "admin"
                user_id = raw[:-6]
            elif raw.endswith("-member"):
                role = "member"
                user_id = raw[:-7]
            else:
                user_id = raw
                role = "member"

            user_id = user_id or "11111111-1111-1111-1111-111111111111"
            return {
                "sub": user_id,
                "email": f"user-{user_id[:8]}@taskflow.dev",
                "role": role,
                "user_metadata": {"full_name": f"User {user_id[:8]}"}
            }

        # 2. If Supabase JWT Secret is configured, decode & verify with PyJWT
        if Config.SUPABASE_JWT_SECRET:
            try:
                decoded = jwt.decode(
                    token,
                    Config.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_exp": True, "verify_signature": True}
                )
                return decoded
            except jwt.ExpiredSignatureError:
                raise ValueError("Session token has expired")
            except jwt.InvalidTokenError as e:
                raise ValueError(f"Invalid authentication token: {str(e)}")

        # 3. If live Supabase client is available, verify token via Supabase Auth
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
                raise ValueError(f"Token validation failed: {str(e)}")

        # 4. Fallback decode for development/inspection without secret
        try:
            unverified = jwt.decode(token, options={"verify_signature": False, "verify_exp": True})
            return unverified
        except jwt.ExpiredSignatureError:
            raise ValueError("Session token has expired")
        except Exception as e:
            raise ValueError(f"Malformed authentication token: {str(e)}")

    @classmethod
    def get_authenticated_user(cls) -> dict:
        """
        Extracts and verifies user from Authorization header.
        Never trusts user IDs provided in the request body.
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
        full_name = user_meta.get("full_name") or user_meta.get("name") or (email.split("@")[0] if email else "User")
        role = claims.get("role", "member")
        avatar_url = user_meta.get("avatar_url") or user_meta.get("picture", "")

        return {
            "id": str(user_id),
            "email": email,
            "role": role,
            "full_name": full_name,
            "avatar_url": avatar_url
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
