import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabNavigationProp, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import BeatDetailsScreen from './screens/BeatDetailsScreen';
import MyBeatsScreen from './screens/MyBeatsScreen';
import EditBeatScreen from './screens/EditBeatScreen';
import ProfileScreen from './screens/ProfileScreen';
import AddBeatScreen from './screens/AddBeatScreen';
import LikedBeatsScreen from './screens/LikedBeatsScreen';
import AllBeatsScreen from './screens/AllBeatsScreen';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import UserProfileScreen from './screens/UserProfileScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RouteProp, ParamListBase } from '@react-navigation/native';
import { Colors } from './theme/theme';

// Icons – using emoji fallbacks for maximum compatibility
const TabIcon = ({ emoji, focused }: { emoji: string; focused: boolean }) => {
  const React2 = require('react');
  const { Text, View } = require('react-native');
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
    </View>
  );
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

type ScreenOptionsProps = {
  route: RouteProp<ParamListBase, string>;
  navigation: BottomTabNavigationProp<ParamListBase, string>;
};

const getScreenOptions = ({ route }: ScreenOptionsProps): BottomTabNavigationOptions => ({
  headerShown: false,
  tabBarActiveTintColor: Colors.tabActive,
  tabBarInactiveTintColor: Colors.tabInactive,
  tabBarStyle: {
    backgroundColor: Colors.tabBar,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    height: 68,
  },
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBarIcon: ({ focused }: { focused: boolean }) => {
    const icons: Record<string, string> = {
      Home: '🏠',
      Explore: '🔍',
      Add: '🎵',
      Rated: '❤️',
      Profile: '👤',
    };
    return <TabIcon emoji={icons[route.name] ?? '•'} focused={focused} />;
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
  if (!authContext) throw new Error('AuthContext not provided');
  const { isAuthenticated } = authContext;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: Colors.primary,
            background: Colors.background,
            card: Colors.backgroundSecondary,
            text: Colors.textPrimary,
            border: 'rgba(255,255,255,0.08)',
            notification: Colors.primary,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '900' },
          },
        }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
          <Stack.Screen name="BeatDetails" component={BeatDetailsScreen as React.ComponentType<any>} />
          <Stack.Screen name="EditBeat" component={EditBeatScreen as React.ComponentType<any>} />
          <Stack.Screen name="AddBeat" component={AddBeatScreen as React.ComponentType<any>} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen as React.ComponentType<any>} />
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