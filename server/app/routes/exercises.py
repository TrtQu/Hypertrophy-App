
# Imports
from flask import Blueprint, request

# Exercises blueprint
exercises_bp = Blueprint('exercises', __name__)


# Exercises View Page
@exercises_bp.get('/exercises')
def get_exercises():
    return "EXERCISES PAGE HI"

# Create new exercise
@exercises_bp.post('/exercises')
def create_exercise():
    return "NEW EXERCISE CREATED HI"