import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';
import { MessageCircle, User } from 'lucide-react-native';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import GroupListScreen from '../screens/groups/GroupListScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import GroupDetailScreen from '../screens/groups/GroupDetailScreen';
import AddInvoiceScreen from '../screens/groups/AddInvoiceScreen';
import ScanQRScreen from '../screens/groups/ScanQRScreen';
import DebtSummaryScreen from '../screens/groups/DebtSummaryScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AccountSettingsScreen from '../screens/profile/AccountSettingsScreen';

// Store & Firebase
import { useAuthStore } from '../store/useAuthStore';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Colors } from '../theme/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        if (route.name === 'Chat') {
          return <MessageCircle color={color} size={size} />;
        } else if (route.name === 'Hồ sơ') {
          return <User color={color} size={size} />;
        }
      },
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.dark.textSecondary,
      tabBarStyle: {
        backgroundColor: Colors.dark.surface,
        borderTopColor: Colors.dark.border,
        paddingBottom: 5,
        height: 60,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen name="Chat" component={GroupListScreen} />
    <Tab.Screen name="Hồ sơ" component={ProfileScreen} />
  </Tab.Navigator>
);

const MainStack = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerStyle: { backgroundColor: Colors.dark.surface },
      headerTintColor: Colors.dark.text,
      headerTitleStyle: { fontWeight: 'bold' },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
    <Stack.Screen name="Create Group" component={CreateGroupScreen} options={{ title: 'Nhóm mới' }} />
    <Stack.Screen name="Group Detail" component={GroupDetailScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Scan QR" component={ScanQRScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Debt Summary" component={DebtSummaryScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Add Invoice" component={AddInvoiceScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Account Settings" component={AccountSettingsScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

export default function AppNavigator() {
  const { user, isLoading, setUser, setIsLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('Auth State Changed:', firebaseUser ? 'User Logged In' : 'No User');
      setUser(firebaseUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
