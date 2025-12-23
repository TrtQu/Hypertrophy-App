from flask import Blueprint, request

# Workouts blueprint
workouts_bp = Blueprint('workouts', __name__)



# Workouts View Page
@workouts_bp.get('/workouts')
def get_workouts():
    return "WORKOUTS PAGE HI"

# Create new workout
@workouts_bp.post('/workouts')
def create_workout():
    return "NEW WORKOUT CREATED HI"