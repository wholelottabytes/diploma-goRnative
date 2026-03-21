import axios from 'axios';
import config from '../screens/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = config.API_URL + '/api';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token
client.interceptors.request.use(
  async (reqConfig) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error getting token from Async Storage', e);
    }
    return reqConfig;
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
