import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabNavigationProp, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './AuthContext';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import HomeScreen from './HomeScreen';
import BeatDetailsScreen from './BeatDetailsScreen';
import MyBeatsScreen from './MyBeatsScreen';
import EditBeatScreen from './EditBeatScreen';
import ProfileScreen from './ProfileScreen';
import AddBeatScreen from './AddBeatScreen';
import LikedBeatsScreen from './LikedBeatsScreen';
import { Home, Search, PlusSquare, Heart, User } from 'react-native-feather';
import AllBeatsScreen from './AllBeatsScreen';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import UserProfileScreen from './UserProfileScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  RouteProp,
  ParamListBase,
  Theme,
} from '@react-navigation/native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
type ScreenOptionsProps = {
  route: RouteProp<ParamListBase, string>;
  navigation: BottomTabNavigationProp<ParamListBase, string>;
  theme: Theme;
};
const getScreenOptions = ({
  route,
}: ScreenOptionsProps): BottomTabNavigationOptions => ({
  headerShown: false,
  tabBarActiveTintColor: '#000',
  tabBarInactiveTintColor: '#888',
  tabBarStyle: {
    paddingBottom: 5,
    height: 60,
  },
  tabBarIcon: ({ color, size }: { color: string; size: number; focused: boolean }) => {
    switch (route.name) {
      case 'Home':
        return <Home color={color} width={size} height={size} />;
      case 'Explore':
        return <Search color={color} width={size} height={size} />;
      case 'Add':
        return <PlusSquare color={color} width={size} height={size} />;
      case 'Rated':
        return <Heart color={color} width={size} height={size} />;
      case 'Profile':
        return <User color={color} width={size} height={size} />;
      default:
        return null;
    }
  },
});

const MainTabs = () => (
  <Tab.Navigator screenOptions={getScreenOptions}>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Explore" component={AllBeatsScreen} />
    <Tab.Screen name="Add" component={MyBeatsScreen} />
    <Tab.Screen name="Rated" component={LikedBeatsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);


const AppContent = () => {
  const authContext = React.useContext(AuthContext);
  if (!authContext) {
    throw new Error('AuthContext не был предоставлен');
  }
  const { isAuthenticated } = authContext;
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
        <Stack.Screen
          name="BeatDetails"
          component={BeatDetailsScreen as React.ComponentType<any>}
        />
        <Stack.Screen
          name="EditBeat"
          component={EditBeatScreen as React.ComponentType<any>}
          options={{ headerShown: false, title: 'Редактировать бит' }}
        />
        <Stack.Screen
          name="AddBeat"
          component={AddBeatScreen as React.ComponentType<any>}
          options={{ headerShown: false, title: 'Добавить бит' }}
        />
        <Stack.Screen
  name="UserProfile"
  component={UserProfileScreen as React.ComponentType<any>}
  options={{ headerShown: false, title: 'Профиль пользователя' }}
/>
      </Stack.Navigator>
    </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}