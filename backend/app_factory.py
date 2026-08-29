"""Flask application factory."""

import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from backend.db_flask import close_db, init_db
from backend.routes.auth import auth_bp
from backend.routes.workouts import workouts_bp
from backend.routes.exercises import exercises_bp
from backend.routes.plans import plans_bp
from backend.routes.profile import profile_bp
from server.db import connect, load_seed

# Project root is one level up from the backend/ package
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_DB_PATH = os.path.join(_PROJECT_ROOT, "server", "hypertrophy.db")
_FRONTEND_SCREENS = os.path.join(_PROJECT_ROOT, "frontend", "screens")


def create_app():
    app = Flask(__name__, static_folder=_FRONTEND_SCREENS, static_url_path='/')

    CORS(app)

    app.config["DATABASE"] = _DEFAULT_DB_PATH
    # Tokens are signed with this. Set SECRET_KEY in the environment for
    # anything beyond local use — the default signs predictable tokens.
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    app.teardown_appcontext(close_db)

    # Errors raised by abort() should look like every other response.
    @app.errorhandler(HTTPException)
    def json_error(e):
        return jsonify({"error": e.description}), e.code

    app.register_blueprint(auth_bp)
    app.register_blueprint(workouts_bp)
    app.register_blueprint(exercises_bp)
    app.register_blueprint(plans_bp)
    app.register_blueprint(profile_bp)

    @app.cli.command("init-db")
    def init_db_command():
        init_db()
        print("Initialized the database.")

    @app.cli.command("seed-db")
    def seed_db_command():
        conn = connect(app.config["DATABASE"])
        try:
            load_seed(conn)
        finally:
            conn.close()
        print("Database seeded.")

    @app.route('/')
    def home():
        return send_from_directory(app.static_folder, 'HomeScreen.js')

    return app
