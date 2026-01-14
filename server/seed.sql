-- =====================
-- Seed data for development/testing
-- =====================

-- Clear existing data (safe for dev only)
DELETE FROM sets;
DELETE FROM workouts;
DELETE FROM exercises;
DELETE FROM users;

-- =====================
-- Users
-- =====================
INSERT INTO users (email, password_hash, username, created_at)
VALUES
  ('test@test.com', 'hashed_password', 'testuser', datetime('now'));

-- =====================
-- Exercises
-- =====================
-- Bilateral exercise
INSERT INTO exercises (user_id, name, muscle_group, created_at)
VALUES
  (1, 'Bench Press', 'Chest', datetime('now'));

-- Unilateral exercise
INSERT INTO exercises (user_id, name, muscle_group, created_at)
VALUES
  (1, 'Dumbbell Curl', 'Biceps', datetime('now'));

-- =====================
-- Workouts
-- =====================
INSERT INTO workouts (user_id, workout_date, name, notes, created_at)
VALUES
  (1, '2025-01-01', 'Push Day', 'Chest focus', datetime('now')),
  (1, '2025-01-08', 'Upper Body', 'Strength focus', datetime('now'));

-- =====================
-- Sets
-- =====================

-- Bench Press (bilateral)
INSERT INTO sets (
  workout_id, exercise_id, set_number, side, reps, weight, is_warmup, created_at
)
VALUES
  (1, 1, 1, 'both', 10, 135, 0, datetime('now')),
  (1, 1, 2, 'both', 8, 155, 0, datetime('now')),
  (2, 1, 1, 'both', 5, 185, 0, datetime('now')),
  (2, 1, 2, 'both', 3, 205, 0, datetime('now'));

-- Dumbbell Curl (unilateral)
INSERT INTO sets (
  workout_id, exercise_id, set_number, side, reps, weight, is_warmup, created_at
)
VALUES
  (1, 2, 1, 'left', 10, 35, 0, datetime('now')),
  (1, 2, 1, 'right', 9, 35, 0, datetime('now')),
  (1, 2, 2, 'left', 8, 40, 0, datetime('now')),
  (1, 2, 2, 'right', 8, 40, 0, datetime('now'));
