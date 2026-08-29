import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { api, setToken, setUnauthorizedHandler } from '../api';

const TOKEN_KEY = 'auth-token';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep the module-level token (used by api()) and React state in step,
  // and remember the token across app restarts.
  const store = async (value) => {
    setToken(value);
    setTokenState(value);
    try {
      if (value) await SecureStore.setItemAsync(TOKEN_KEY, value);
      else await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Device store unavailable — the session still works until the app closes.
    }
  };

  useEffect(() => {
    setUnauthorizedHandler(() => store(null));

    SecureStore.getItemAsync(TOKEN_KEY)
      .then((saved) => {
        if (saved) {
          setToken(saved);
          setTokenState(saved);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const submit = async (path, body) => {
    const res = await api(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not reach the server');

    await store(data.token);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        loading,
        signIn:  (email, password)           => submit('/auth/login',  { email, password }),
        signUp:  (email, password, username) => submit('/auth/signup', { email, password, username }),
        signOut: () => store(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
