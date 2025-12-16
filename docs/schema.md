# Database Schema

This document describes the SQLite database schema for the Hypertrophy App.

---

## users
Stores user accounts.

- id (INTEGER, PK)
- email (TEXT, UNIQUE)
- password_hash (TEXT)
- created_at (TEXT)

---

## workouts
Stores workout sessions.

- id (INTEGER, PK)
- user_id (INTEGER, FK → users.id)
- workout_date (TEXT)
- name (TEXT)
- created_at (TEXT)

---

## exercises
Stores exercises.

- id (INTEGER, PK)
- user_id (INTEGER, nullable)
- name (TEXT)
- muscle_group (TEXT)

---

## sets
Stores individual sets.

- id (INTEGER, PK)
- workout_id (INTEGER, FK → workouts.id)
- exercise_id (INTEGER, FK → exercises.id)
- reps (INTEGER)
- weight (REAL)
- set_number (INTEGER)
- created_at (TEXT)

---

## Stored vs Derived Metrics

Stored:
- reps
- weight
- timestamps

Derived:
- volume = reps × weight
- total workout volume
- progress over time
