
# Imports
from flask import Flask
from app.routes.workouts import workouts_bp
from app.routes.exercises import exercises_bp
import sqlite3




# Initialize Flask app
app = Flask(__name__)

# Register Blueprints
app.register_blueprint(workouts_bp)
app.register_blueprint(exercises_bp)



# HOME PAGE
@app.route('/')
def index():
    return "HOME PAGE HI"

# EDIT LATER, EITHER POST OR GET
@app.route('/settings')
def settings():
    return "SETTINGS PAGE HI"

# Profile Page
@app.route('/profile')
def profile():
    return "PROFILE PAGE HI"

if __name__ == '__main__':
    app.run(debug=True)
