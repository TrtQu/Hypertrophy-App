PRAGMA foreign_keys = ON;

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
-- workout_plans
-- =====================
CREATE TABLE workout_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =====================
-- plan_days
-- Each row is one named training day within a plan (e.g. "Push Day").
-- day_of_week: 0=Sunday ... 6=Saturday. NULL means the plan is not
-- pinned to a fixed weekday (floating / auto-rotate schedule).
-- =====================
CREATE TABLE plan_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    order_in_plan INTEGER NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id)
);

-- =====================
-- plan_exercises
-- Exercises belonging to a specific day within a plan.
-- =====================
CREATE TABLE plan_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    day_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    order_in_day INTEGER NOT NULL,
    target_sets INTEGER,
    target_reps INTEGER,
    notes TEXT,
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id),
    FOREIGN KEY (day_id) REFERENCES plan_days(id),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- =====================
-- workouts
-- A single logged workout session. plan_id is nullable —
-- workouts can be ad-hoc or tied to a plan.
-- =====================
CREATE TABLE workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    workout_date TEXT NOT NULL,
    name TEXT,
    notes TEXT,
    plan_id INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id)
);

-- =====================
-- sets
-- =====================
CREATE TABLE sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    set_number INTEGER NOT NULL,
    side TEXT NOT NULL DEFAULT 'both' CHECK (side IN ('left', 'right', 'both')),
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
-- Indexes
-- =====================
CREATE INDEX idx_workouts_user_date   ON workouts(user_id, workout_date);
CREATE INDEX idx_sets_workout         ON sets(workout_id);
CREATE INDEX idx_sets_exercise        ON sets(exercise_id);
CREATE INDEX idx_plan_exercises_plan  ON plan_exercises(plan_id);
CREATE INDEX idx_plan_exercises_day   ON plan_exercises(day_id);
CREATE INDEX idx_plan_days_plan       ON plan_days(plan_id);
