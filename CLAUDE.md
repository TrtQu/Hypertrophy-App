# Hypertrophy App

Mobile workout tracking app. Three-tier architecture: Expo/React Native frontend, Flask backend, SQLite database.

## Stack

- Frontend: Expo ~54, React Native 0.81.5, React 19, React Navigation v7 (bottom-tab nav)
- Backend: Python/Flask, blueprints (`workouts`, `exercises`), app factory pattern, Flask-CORS
- Database: SQLite (`hypertrophy.db`), schema via `schema.sql`, connections via `db.py` using Flask's `g` object

## Project Structure

- `/mobile/myApp` — Expo frontend
- `/server` — Flask backend

## Current State

- Flask routes exist but return placeholder strings — next step is wiring them to real SQLite calls using the queries in `server/queries.sql`
- `schema.sql` defines the full data model including `plan_days` table
- `seed.sql` has 9 exercises across 5 muscle groups + a full PPL plan
- Run `flask init-db` then reload `seed.sql` if `hypertrophy.db` is out of date
