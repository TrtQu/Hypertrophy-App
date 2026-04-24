"""
WSGI entrypoint.

Run locally:
    flask --app backend.wsgi run --debug

Or directly:
    python -m backend.wsgi
"""

from backend.app_factory import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
