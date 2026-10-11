import logging
import os
from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import Config
from backend.routes.health_routes import health_bp
from backend.routes.auth_routes import auth_bp
from backend.routes.task_routes import task_bp
from backend.routes.user_routes import user_bp
from backend.routes.notification_routes import notification_bp
from backend.routes.dashboard_routes import dashboard_bp
from backend.routes.reminder_routes import reminder_bp
from backend.routes.admin_routes import admin_bp
from backend.routes.setup_routes import setup_bp

# Configure logging
logging.basicConfig(
    level=logging.INFO if not Config.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("taskflow")

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # 1. Restrict CORS to configured origins
    CORS(
        app,
        resources={r"/api/*": {"origins": config_class.CORS_ORIGINS}},
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-CRON-KEY", "Accept"],
        supports_credentials=True,
        max_age=86400
    )

    # 2. Register Blueprints
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(setup_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(task_bp, url_prefix="/api/tasks")
    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(notification_bp, url_prefix="/api/notifications")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(reminder_bp, url_prefix="/api/reminders")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    # Direct /api/me route as required by specifications
    from backend.services.auth_service import require_auth
    from backend.routes.auth_routes import get_current_user_profile

    @app.route("/api/me", methods=["GET"])
    @require_auth
    def api_me():
        return get_current_user_profile()

    # 3. Security Headers Middleware
    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # 4. Global Error Handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad Request", "message": str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"error": "Unauthorized", "message": "Authentication required"}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "Forbidden", "message": "You do not have permission to perform this action"}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not Found", "message": "The requested resource was not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method Not Allowed", "message": "The HTTP method is not supported"}), 405

    @app.errorhandler(500)
    def server_error(e):
        logger.error("Unhandled internal server error: %s", e)
        # Avoid leaking raw stack traces to the client in production
        return jsonify({
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later."
        }), 500

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
