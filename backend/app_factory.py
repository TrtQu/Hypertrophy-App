"""Flask application factory."""

import os

from flask import Flask, send_from_directory
from flask_cors import CORS

from backend.db_flask import close_db, init_db
from backend.routes.workouts import workouts_bp
from backend.routes.exercises import exercises_bp
from backend.routes.plans import plans_bp

# Project root is one level up from the backend/ package
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_DB_PATH = os.path.join(_PROJECT_ROOT, "server", "hypertrophy.db")
_FRONTEND_SCREENS = os.path.join(_PROJECT_ROOT, "frontend", "screens")


def create_app():
    app = Flask(__name__, static_folder=_FRONTEND_SCREENS, static_url_path='/')

    CORS(app)

    app.config["DATABASE"] = _DEFAULT_DB_PATH
    app.teardown_appcontext(close_db)

    app.register_blueprint(workouts_bp)
    app.register_blueprint(exercises_bp)
    app.register_blueprint(plans_bp)

    @app.cli.command("init-db")
    def init_db_command():
        init_db()
        print("Initialized the database.")

    @app.route('/')
    def home():
        return send_from_directory(app.static_folder, 'HomeScreen.js')

    @app.route('/settings')
    def settings():
        return "SETTINGS PAGE HI"

    @app.route('/profile')
    def profile():
        return "PROFILE PAGE HI"

    return app
