import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
import TopUpScreen from './screens/TopUpScreen';
import ManagerScreen from './screens/ManagerScreen';
import MyPurchasesScreen from './screens/MyPurchasesScreen';
import LoadingScreen from './screens/LoadingScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RouteProp, ParamListBase } from '@react-navigation/native';
import { Colors, BorderRadius, Spacing } from './theme/theme';
import { Home, Compass, Plus, Heart, User } from 'react-native-feather';

// Modern outline icons for glass style tab bar
const TabIcon = ({ icon: Icon, focused }: { icon: any; focused: boolean }) => {
  return (
    <View style={styles.iconContainer}>
      <Icon
        width={22}
        height={22}
        stroke={focused ? Colors.primary : Colors.textMuted}
        strokeWidth={focused ? 2.5 : 2}
      />
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
  tabBarActiveTintColor: Colors.primary,
  tabBarInactiveTintColor: Colors.textMuted,
  tabBarStyle: styles.tabBar,
  tabBarIcon: ({ focused }: { focused: boolean }) => {
    const icons: Record<string, any> = {
      Home: Home,
      Explore: Compass,
      Add: Plus,
      Rated: Heart,
      Profile: User,
    };
    return <TabIcon icon={icons[route.name] ?? Home} focused={focused} />;
  },
});

const MainTabs = () => {
  const authContext = React.useContext(AuthContext);
  const userRoles = authContext?.user?.roles || [];
  const isProducer = userRoles.includes('producer');
  
  return (
    <Tab.Navigator screenOptions={getScreenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={AllBeatsScreen} />
      {isProducer && <Tab.Screen name="Add" component={MyBeatsScreen} />}
      <Tab.Screen name="Rated" component={LikedBeatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppContent = () => {
  const authContext = React.useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  
  if (loading) {
    return <LoadingScreen onFinish={() => setLoading(false)} />;
  }
  
  if (!authContext) {
    return null;
  }
  const { isAuthenticated } = authContext;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: Colors.primary,
            background: Colors.background,
            card: 'rgba(255,255,255,0.05)',
            text: Colors.textPrimary,
            border: 'rgba(255,255,255,0.08)',
            notification: Colors.primary,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '600' },
            heavy: { fontFamily: 'System', fontWeight: '700' },
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
          <Stack.Screen name="TopUp" component={TopUpScreen as React.ComponentType<any>} />
          <Stack.Screen name="Manager" component={ManagerScreen} />
          <Stack.Screen name="MyPurchases" component={MyPurchasesScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: Spacing['2xl'],
    right: Spacing['2xl'],
    backgroundColor: 'rgba(20,20,30,0.85)',
    backdropFilter: 'blur(20)',
    borderTopWidth: 0,
    borderRadius: BorderRadius['2xl'],
    height: 72,
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
