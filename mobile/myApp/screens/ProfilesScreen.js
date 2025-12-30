import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function profilescreen() {  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Profile</Text>  
      <Text style={styles.subtitle}>Stats like weight and height (maybe over time)</Text>
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