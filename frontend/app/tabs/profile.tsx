import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function Profile() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const storedEmail = await AsyncStorage.getItem('email');
      if (storedEmail) setEmail(storedEmail);
    }
    load();
  }, []);

  const logout = async () => {
    await AsyncStorage.clear();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Email:</Text>
      <Text style={styles.email}>{email}</Text>

      <View style={styles.buttonContainer}>
        <Button title="Logout" onPress={logout} color="#d9534f" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 20, marginBottom: 10 },
  email: { fontSize: 18, marginBottom: 30 },
  buttonContainer: { width: '50%' }
});
