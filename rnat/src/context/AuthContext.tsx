import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import client from '../api/client'; // Import the Axios client
import { userApi } from '../api/services'; // Import userApi

// Определяем типы для контекста
interface User {
    _id: string;
    username: string;
    token: string;
    // Add other user profile fields if needed
    name?: string;
    email?: string;
    phone?: string;
    roles?: string[];
    rating?: number;
}
function parseJwt(token: string) {
    try {
        return jwtDecode(token);
    } catch (error) {
        console.error('Error parsing JWT:', error);
        return null;
    }
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
}

// Начальное значение контекста
const initialAuthContext: AuthContextType = {
    isAuthenticated: false,
    user: null,
    login: async () => {},
    logout: async () => {},
};

// Создаём контекст с начальным значением
export const AuthContext = createContext<AuthContextType>(initialAuthContext);

// Пропсы для провайдера
interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);

    // Helper to set Axios header
    const setAuthHeader = (token: string | null) => {
        if (token) {
            client.defaults.headers.common.Authorization = `Bearer ${token}`;
        } else {
            delete client.defaults.headers.common.Authorization;
        }
    };

    const logout = useCallback(async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        setAuthHeader(null); // Clear header on logout

        setIsAuthenticated(false);
        setUser(null);
    }, []);

    // Проверка авторизации при запуске
   useEffect(() => {
    const checkAuth = async () => {
        const token = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');

        if (token && storedUser) {
            const payload = parseJwt(token);

            if (payload && payload.exp) {
                const currentTime = Math.floor(Date.now() / 1000); // текущее время в секундах
                if (payload.exp > currentTime) {
                    setIsAuthenticated(true);
                    const parsedUser: User = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setAuthHeader(token); // Set header on startup
                    return;
                }
            }

            // токен просрочен или некорректен
            await logout();
        }
        setAuthHeader(null); // Clear header if no valid token
    };

    checkAuth();
}, [logout]);


    // Вход
    const login = async (token: string, userData: User) => {
        console.log('Token:', token);
        console.log('User при логине:', userData);
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setIsAuthenticated(true);
        setUser(userData);
        setAuthHeader(token); // Set header after login
    };

    // Fetch full user profile after authentication
    useEffect(() => {
        const fetchProfile = async () => {
            if (isAuthenticated && user && !user.name) { // Only fetch if authenticated and full profile not yet loaded
                try {
                    const profileRes = await userApi.getProfile();
                    const fullProfileData: User = profileRes.data;
                    setUser(prevUser => ({
                        ...prevUser,
                        ...fullProfileData,
                        token: prevUser?.token || fullProfileData.token, // Ensure token is preserved
                    }));
                    await AsyncStorage.setItem('user', JSON.stringify({
                        ...user, // Basic user data from initial login
                        ...fullProfileData, // Full profile data
                        token: user.token, // Ensure token is preserved
                    }));
                } catch (error) {
                    console.error('Failed to fetch user profile:', error);
                    // Handle error, e.g., logout or show a message
                }
            }
        };
        fetchProfile();
    }, [isAuthenticated, user, user?.name]); // Re-run if isAuthenticated changes or user changes (especially user.name is null)


    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
