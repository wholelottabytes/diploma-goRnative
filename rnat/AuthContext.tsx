import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Определяем типы для контекста
interface User {
    _id: string;
    username: string;
    token: string;
}
function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        return JSON.parse(jsonPayload);
    } catch (error) {
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
                    setUser(JSON.parse(storedUser));
                    return;
                }
            }

            // токен просрочен или некорректен
            await logout();
        }
    };

    checkAuth();
}, []);


    // Вход
    const login = async (token: string, user: User) => {
    console.log('Token:', token);
    console.log('User при логине:', user);
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setIsAuthenticated(true);
    setUser(user);
};

    // Выход
    const logout = async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');

        setIsAuthenticated(false);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
