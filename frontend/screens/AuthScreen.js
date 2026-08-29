import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../context/AuthContext';

const MIN_PASSWORD_LENGTH = 8;

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode]         = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);

  const isSignUp = mode === 'signup';

  const switchMode = () => {
    setMode(isSignUp ? 'signin' : 'signup');
    setError(null);
  };

  const submit = async () => {
    setError(null);

    if (!email.trim()) return setError('Enter your email.');
    if (isSignUp && !username.trim()) return setError('Pick a username.');
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    setBusy(true);
    try {
      if (isSignUp) await signUp(email.trim(), password, username.trim());
      else await signIn(email.trim(), password);
      // On success the app swaps this screen out, so there is nothing to reset.
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Hypertrophy</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create an account to start tracking.' : 'Sign in to your training log.'}
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />

            {isSignUp && (
              <>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="What should we call you?"
                  placeholderTextColor="#6b7280"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              textContentType={isSignUp ? 'newPassword' : 'password'}
              onSubmitEditing={submit}
              returnKeyType="go"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submitBtn, busy && styles.submitBtnBusy]}
              onPress={submit}
              disabled={busy}
            >
              {busy
                ? <ActivityIndicator color="#ffffff" />
                : <Text style={styles.submitText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.switchBtn} onPress={switchMode} disabled={busy}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  title: { fontSize: 34, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 8, marginBottom: 28 },

  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    padding: 20,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f9fafb',
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 18,
  },

  error: { color: '#ef4444', fontSize: 13, marginBottom: 14, lineHeight: 18 },

  submitBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnBusy: { opacity: 0.7 },
  submitText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#9ca3af', fontSize: 14 },
});
