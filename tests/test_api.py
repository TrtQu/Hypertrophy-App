"""End-to-end checks for the API, against a throwaway seeded database.

Run from the project root:  python tests/test_api.py
"""

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app_factory import create_app
from server.db import connect, init_schema, load_seed

SEED_EMAIL = 'test@test.com'
SEED_PASSWORD = 'password123'


def fresh_client():
    """A test client wired to a new seeded database file."""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)

    conn = connect(path)
    init_schema(conn)
    load_seed(conn)
    conn.close()

    app = create_app()
    app.config['DATABASE'] = path
    app.config['SECRET_KEY'] = 'test-secret'
    app.config['TESTING'] = True
    return app.test_client(), path


def auth(token):
    return {'Authorization': f'Bearer {token}'}


def login(client, email=SEED_EMAIL, password=SEED_PASSWORD):
    res = client.post('/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200, res.get_json()
    return res.get_json()['token']


def test_locked_without_token(client):
    for path in ('/exercises', '/workouts', '/plans', '/profile', '/stats'):
        res = client.get(path)
        assert res.status_code == 401, f'{path} should need a token, got {res.status_code}'
        assert 'error' in res.get_json(), f'{path} should return a JSON error'

    res = client.get('/exercises', headers=auth('not-a-real-token'))
    assert res.status_code == 401, 'a forged token should be refused'


def test_login(client):
    res = client.post('/auth/login', json={'email': SEED_EMAIL, 'password': 'wrong'})
    assert res.status_code == 401, 'wrong password should be refused'

    res = client.post('/auth/login', json={'email': 'nobody@example.com', 'password': 'password123'})
    assert res.status_code == 401, 'unknown email should be refused'

    token = login(client)
    assert token, 'login should return a token'

    # Email case should not matter.
    assert login(client, email='TEST@TEST.COM')


def test_signup(client):
    res = client.post('/auth/signup', json={'email': 'a@b.com', 'password': 'short', 'username': 'shorty'})
    assert res.status_code == 400, 'short passwords should be refused'

    res = client.post('/auth/signup', json={'email': '', 'password': 'password123', 'username': 'x'})
    assert res.status_code == 400, 'a missing email should be refused'

    res = client.post('/auth/signup', json={'email': SEED_EMAIL, 'password': 'password123', 'username': 'copycat'})
    assert res.status_code == 409, 'a duplicate email should be refused'

    res = client.post('/auth/signup', json={'email': 'new@user.com', 'password': 'password123', 'username': 'newbie'})
    assert res.status_code == 201, res.get_json()
    token = res.get_json()['token']

    # The new account can sign in with the password it just set.
    assert login(client, email='new@user.com', password='password123')
    return token


def test_exercises(client, token):
    res = client.get('/exercises', headers=auth(token))
    assert res.status_code == 200
    seeded = res.get_json()
    assert len(seeded) == 18, f'seed has 18 exercises, got {len(seeded)}'

    res = client.post('/exercises', headers=auth(token),
                      json={'name': 'Cable Crossover', 'muscle_group': 'Chest', 'is_unilateral': True})
    assert res.status_code == 201, res.get_json()
    new_id = res.get_json()['id']

    res = client.post('/exercises', headers=auth(token), json={'name': 'Cable Crossover'})
    assert res.status_code == 409, 'duplicate exercise names should be refused'

    res = client.post('/exercises', headers=auth(token), json={'name': '   '})
    assert res.status_code == 400, 'a blank name should be refused'

    assert len(client.get('/exercises', headers=auth(token)).get_json()) == 19

    assert client.delete(f'/exercises/{new_id}', headers=auth(token)).status_code == 200
    assert len(client.get('/exercises', headers=auth(token)).get_json()) == 18


def test_workouts_and_stats(client, token):
    res = client.get('/workouts', headers=auth(token))
    assert len(res.get_json()) == 2, 'seed has 2 workouts'

    res = client.post('/workouts', headers=auth(token), json={
        'workout_date': '2025-02-01',
        'name': 'Test Push',
        'sets': [{'exercise_id': 1, 'set_number': 1, 'reps': 5, 'weight': 200}],
    })
    assert res.status_code == 201, res.get_json()
    workout_id = res.get_json()['id']

    res = client.get(f'/workouts/{workout_id}', headers=auth(token))
    body = res.get_json()
    assert body['name'] == 'Test Push'
    assert body['sets'][0]['weight'] == 200
    assert body['sets'][0]['exercise_name'] == 'Bench Press'

    assert client.post('/workouts', headers=auth(token), json={'name': 'No date'}).status_code == 400

    stats = client.get('/stats', headers=auth(token)).get_json()
    assert set(stats) == {'workouts_this_week', 'streak', 'todays_split'}
    assert isinstance(stats['streak'], int)

    # The new workout set a personal record, so the profile should show it.
    prs = client.get('/profile', headers=auth(token)).get_json()['prs']
    assert prs[0]['max_weight'] == 200

    assert client.delete(f'/workouts/{workout_id}', headers=auth(token)).status_code == 200
    assert len(client.get('/workouts', headers=auth(token)).get_json()) == 2


def test_plans(client, token):
    plans = client.get('/plans', headers=auth(token)).get_json()
    assert len(plans) == 3, 'seed has 3 plans'
    assert any(p['name'] == 'Push' for p in plans)

    res = client.post('/plans', headers=auth(token), json={'name': 'Upper'})
    assert res.status_code == 201
    plan_id = res.get_json()['id']

    # A plan created with no days still gets one, so exercises have a home.
    res = client.post(f'/plans/{plan_id}/exercises', headers=auth(token),
                      json={'exercise_id': 1, 'target_sets': 4, 'target_reps': 6})
    assert res.status_code == 201, res.get_json()
    plan_exercise_id = res.get_json()['id']

    detail = client.get(f'/plans/{plan_id}/detail', headers=auth(token)).get_json()
    assert len(detail['exercises']) == 1
    assert len(detail['exercises'][0]['sets']) == 4, 'target_sets should expand into 4 sets'

    res = client.put(f'/plans/{plan_id}/sets', headers=auth(token), json={
        'exercises': [{'plan_exercise_id': plan_exercise_id,
                       'sets': [{'set_number': 1, 'target_reps': 12}, {'set_number': 2, 'target_reps': 12}]}]
    })
    assert res.status_code == 200
    detail = client.get(f'/plans/{plan_id}/detail', headers=auth(token)).get_json()
    assert len(detail['exercises'][0]['sets']) == 2, 'saved targets should come back'

    assert client.delete(f'/plans/{plan_id}/exercises/{plan_exercise_id}', headers=auth(token)).status_code == 200
    assert client.get(f'/plans/{plan_id}/detail', headers=auth(token)).get_json()['exercises'] == []

    assert client.delete(f'/plans/{plan_id}', headers=auth(token)).status_code == 200
    assert len(client.get('/plans', headers=auth(token)).get_json()) == 3


def test_profile(client, token):
    body = client.get('/profile', headers=auth(token)).get_json()
    assert body['username'] == 'testuser'
    assert body['email'] == SEED_EMAIL
    assert body['stats']['total_workouts'] == 2

    assert client.patch('/profile', headers=auth(token), json={'username': '  '}).status_code == 400

    assert client.patch('/profile', headers=auth(token), json={'username': 'renamed'}).status_code == 200
    assert client.get('/profile', headers=auth(token)).get_json()['username'] == 'renamed'


def test_accounts_are_separate(client, seed_token, other_token):
    """A second account must not see or touch the first one's data."""
    assert client.get('/exercises', headers=auth(other_token)).get_json() == []
    assert client.get('/plans', headers=auth(other_token)).get_json() == []
    assert client.get('/workouts', headers=auth(other_token)).get_json() == []

    plan_id = client.get('/plans', headers=auth(seed_token)).get_json()[0]['id']
    assert client.get(f'/plans/{plan_id}', headers=auth(other_token)).status_code == 404
    assert client.get(f'/plans/{plan_id}/detail', headers=auth(other_token)).status_code == 404
    assert client.post(f'/plans/{plan_id}/exercises', headers=auth(other_token),
                       json={'exercise_id': 1}).status_code == 404

    # Deletes must not reach across accounts either.
    plan_exercise_id = client.get(f'/plans/{plan_id}/detail',
                                  headers=auth(seed_token)).get_json()['exercises'][0]['plan_exercise_id']
    assert client.delete(f'/plans/{plan_id}/exercises/{plan_exercise_id}',
                         headers=auth(other_token)).status_code == 404
    assert client.delete(f'/plans/{plan_id}', headers=auth(other_token)).status_code == 404

    workout_id = client.get('/workouts', headers=auth(seed_token)).get_json()[0]['id']
    assert client.get(f'/workouts/{workout_id}', headers=auth(other_token)).status_code == 404
    assert client.delete(f'/workouts/{workout_id}', headers=auth(other_token)).status_code == 404

    exercise_id = client.get('/exercises', headers=auth(seed_token)).get_json()[0]['id']
    assert client.delete(f'/exercises/{exercise_id}', headers=auth(other_token)).status_code == 404

    # Borrowed exercise ids must not show up in the other account's own data.
    other_plan_id = client.post('/plans', headers=auth(other_token), json={'name': 'Mine'}).get_json()['id']
    assert client.post(f'/plans/{other_plan_id}/exercises', headers=auth(other_token),
                       json={'exercise_id': exercise_id}).status_code == 404
    assert client.post('/workouts', headers=auth(other_token), json={
        'workout_date': '2025-02-02',
        'sets': [{'exercise_id': exercise_id, 'set_number': 1, 'reps': 5, 'weight': 100}],
    }).status_code == 400
    assert client.delete(f'/plans/{other_plan_id}', headers=auth(other_token)).status_code == 200

    assert client.get('/profile', headers=auth(other_token)).get_json()['username'] == 'newbie'

    # The first account's data survived the second one's attempts.
    assert len(client.get('/plans', headers=auth(seed_token)).get_json()) == 3
    assert len(client.get('/exercises', headers=auth(seed_token)).get_json()) == 18
    assert len(client.get('/workouts', headers=auth(seed_token)).get_json()) == 2
    assert len(client.get(f'/plans/{plan_id}/detail',
                          headers=auth(seed_token)).get_json()['exercises']) > 0


def main():
    client, db_path = fresh_client()
    try:
        test_locked_without_token(client)
        test_login(client)
        other_token = test_signup(client)

        token = login(client)
        test_exercises(client, token)
        test_workouts_and_stats(client, token)
        test_plans(client, token)
        test_accounts_are_separate(client, token, other_token)
        test_profile(client, token)  # last: it renames the user
    finally:
        try:
            os.remove(db_path)
        except OSError:
            pass

    print('All API checks passed.')


if __name__ == '__main__':
    main()
