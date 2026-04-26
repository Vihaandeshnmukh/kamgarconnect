import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import WorkerRegisterScreen from '../screens/WorkerRegisterScreen';
import EmployerRegisterScreen from '../screens/EmployerRegisterScreen';
import WorkerDashboard from '../screens/WorkerDashboard';
import EmployerDashboard from '../screens/EmployerDashboard';
import JobDetailScreen from '../screens/JobDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerStyle: { backgroundColor: '#1A3C6E' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen 
        name="Splash" 
        component={SplashScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen name="WorkerRegister" component={WorkerRegisterScreen} options={{ title: 'Worker Registration' }} />
      <Stack.Screen name="EmployerRegister" component={EmployerRegisterScreen} options={{ title: 'Employer Registration' }} />
      <Stack.Screen name="WorkerDashboard" component={WorkerDashboard} options={{ title: 'Dashboard', headerLeft: null }} />
      <Stack.Screen name="EmployerDashboard" component={EmployerDashboard} options={{ title: 'Dashboard', headerLeft: null }} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job Details' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}
