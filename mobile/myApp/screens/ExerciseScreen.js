import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function exercisesscreen() {  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Exercise</Text>  
      <Text style={styles.subtitle}>Maybe Different Workouts and Alts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
  },
});