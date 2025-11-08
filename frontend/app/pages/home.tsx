import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      Alert.alert('Logged out', 'You have been logged out successfully.');
      router.replace('/'); // goes back to login screen
    } catch (err) {
      console.error('Logout error:', err);
      Alert.alert('Error', 'Could not log out. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the App!</Text>
      <Text style={styles.subtitle}>You are successfully logged in.</Text>
      <View style={{ marginTop: 20 }}>
        <Button title="Logout" onPress={handleLogout} color="#D9534F" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
});
