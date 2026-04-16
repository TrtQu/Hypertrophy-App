# IMPORTS
import os
from flask import Flask, send_from_directory
from flask_cors import CORS

from app.routes.workouts import workouts_bp
from app.routes.exercises import exercises_bp
from app.routes.plans import plans_bp
from server.db import close_db, init_db

# Handles all of app creation and config logic
# Hi this hayk 
def create_app():
    app = Flask(__name__, static_folder='../mobile/myApp/screens', static_url_path='/')

    CORS(app)

    app.config["DATABASE"] = os.path.join(app.root_path, "hypertrophy.db")
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

# Create app instance
app = create_app()

if __name__ == '__main__':
    app.run(debug=True)

