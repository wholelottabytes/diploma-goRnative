import axios from 'axios';
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the API URL from environment variables, fallback to local android emulator loopback
const BASE_URL = API_URL || 'http://10.0.2.2:8000/api';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error getting token from Async Storage', e);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Add global response interceptor for logging operations
client.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error Response:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default client;
