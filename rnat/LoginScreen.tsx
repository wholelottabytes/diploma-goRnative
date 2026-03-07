import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { LoginScreenNavigationProp } from './type.ts';
import config from './config';

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error('AuthContext не был предоставлен');
  }

  const { login, user, isAuthenticated } = authContext;

  const handleLogin = async () => {
    const formattedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!formattedUsername || !trimmedPassword) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все поля');
      return;
    }

    if (trimmedPassword.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 6 символов');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`http://${config.serverIP}:5000/auth/login`, { 
        username: formattedUsername, 
        password: trimmedPassword 
      });

      const { token, user } = response.data;
      console.log('User при входе:', user);
      await login(token, { ...user, token });

      Alert.alert('Успешный вход!', `Добро пожаловать, ${user.username}`);
    } catch (error: any) {
      console.log(error); 
      if (error.response) {
        Alert.alert('Ошибка входа', error.response.data.message || 'Неверные данные');
      } else if (error.request) {
        Alert.alert('Ошибка', 'Проблемы с сервером, попробуйте позже');
      } else {
        Alert.alert('Ошибка', 'Неизвестная ошибка, попробуйте снова');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.welcomeText}>Добро пожаловать, {user?.username}!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Sign in to continue!</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
            />
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Sign in</Text>
            </TouchableOpacity>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>I'm a new user. </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 290,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    color: 'black', 
  },
  button: {
    backgroundColor: 'black',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
    
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  footerLink: {
    fontSize: 14,
    color: 'green',
    fontWeight: '500',
  },
  loader: {
    marginVertical: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
});

export default LoginScreen;