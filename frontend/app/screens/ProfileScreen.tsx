import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    async function loadUser() {
      const savedEmail = await AsyncStorage.getItem('email');
      if (savedEmail) setEmail(savedEmail);
    }
    loadUser();
  }, []);

  const logout = async () => {
    await AsyncStorage.clear();
    navigation.replace("Login"); 
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
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 20, marginBottom: 10 },
  email: { fontSize: 18, marginBottom: 30 },
  buttonContainer: { width: '50%' }
});
