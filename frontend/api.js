import { API } from './config';

// The bearer token lives here so screens can keep calling api() without
// threading it through props. AuthContext owns the value.
let token = null;
let onUnauthorized = () => {};

export function setToken(value) {
  token = value;
}

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/** fetch() against the backend, with the signed-in user's token attached. */
export async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });

  // An expired or rejected token should drop the user back to the sign-in
  // screen rather than leaving every screen stuck on an error.
  if (res.status === 401) onUnauthorized();

  return res;
}
