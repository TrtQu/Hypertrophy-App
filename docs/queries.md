# Database Queries

This document defines common SQL queries used by the backend
to retrieve and compute data from the SQLite database.

These queries are written for SQLite and use `?` placeholders
for parameters provided by the backend.

---

## Get all workouts for a user
Used for the workout history screen.

**Inputs**
- user_id

```sql
SELECT *
FROM workouts
WHERE user_id = ?
ORDER BY workout_date DESC;
```

## Get all sets for a workout
```sql
SELECT
    s.id,
    s.set_number,
    s.reps,
    s.weight,
    s.is_warmup,
    s.rpe,
    s.notes,
    e.name AS exercise_name
FROM sets s
JOIN exercises e ON s.exercise_id = e.id
WHERE s.workout_id = ?
ORDER BY e.name, s.set_number;
```

## Get exercise history
```sql
SELECT
    w.workout_date,
    s.reps,
    s.weight
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE w.user_id = ?
  AND s.exercise_id = ?
ORDER BY w.workout_date;
```

## Total volume per exercise per day
```sql
SELECT
    w.workout_date,
    e.id AS exercise_id,
    e.name AS exercise_name,
    SUM(s.reps * s.weight) AS total_volume
FROM sets s
JOIN workouts w ON s.workout_id = w.id
JOIN exercises e ON s.exercise_id = e.id
WHERE w.user_id = ?
GROUP BY w.workout_date, e.id
ORDER BY w.workout_date;
```


## Max weight per exercise
```sql
SELECT
    e.id AS exercise_id,
    e.name AS exercise_name,
    MAX(s.weight) AS max_weight
FROM sets s
JOIN exercises e ON s.exercise_id = e.id
JOIN workouts w ON s.workout_id = w.id
WHERE w.user_id = ?
GROUP BY e.id;
```


---

## How backend will use this (important context)

Backend dev will:
1. Copy the SQL
2. Paste into Python
3. Replace `?` with values

Example:
```python
cursor.execute(query, (user_id,))
