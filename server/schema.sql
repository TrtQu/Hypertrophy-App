PRAGMA foreign_keys = ON;

-- This is a single-line comment
-- =====================
-- users
-- =====================
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

-- =====================
-- exercises
-- =====================
CREATE TABLE exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    muscle_group TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =====================
-- workouts
-- =====================
CREATE TABLE workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    workout_date TEXT NOT NULL,
    name TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =====================
-- sets
-- =====================
CREATE TABLE sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    set_number INTEGER NOT NULL,
    side TEXT NOT NULL DEFAULT 'both' CHECK (side IN ('left','right','both')),
    reps INTEGER NOT NULL,
    weight REAL NOT NULL,
    is_warmup INTEGER NOT NULL DEFAULT 0,
    rpe REAL,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (workout_id) REFERENCES workouts(id),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- =====================
-- Indexes (performance)
-- =====================
CREATE INDEX idx_workouts_user_date
ON workouts(user_id, workout_date);

CREATE INDEX idx_sets_workout
ON sets(workout_id);

CREATE INDEX idx_sets_exercise
ON sets(exercise_id);
