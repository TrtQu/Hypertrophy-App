
# Imports
from flask import Flask
import sqlite3




# Initialize Flask app
app = Flask(__name__)

# HOME PAGE
@app.route('/')
def index():
    return "HOME PAGE HI"


if __name__ == '__main__':
    app.run(debug=True)
