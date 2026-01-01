
# Imports
from flask import Flask, send_from_directory
from flask_cors import CORS
from app.routes.workouts import workouts_bp
from app.routes.exercises import exercises_bp
import sqlite3




# Initialize Flask app
app = Flask(__name__, static_folder='../mobile/myApp/screens', static_url_path='/')

# Allows requests from the app
CORS(app)

# Register Blueprints
app.register_blueprint(workouts_bp)
app.register_blueprint(exercises_bp)



# HOME PAGE
@app.route('/')
def home():
    return send_from_directory(app.static_folder, 'HomeScreen.js')

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
