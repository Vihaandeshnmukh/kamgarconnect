import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert, Platform } from 'react-native';
import AppNavigator from './navigation/AppNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const navigationRef = useRef();

  useEffect(() => {
    // Listener for notifications received while app is running
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      // Logic for received notification can go here
    });

    // Listener for when user taps on a notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data.jobId) {
        navigationRef.current?.navigate('JobDetail', { job: { _id: data.jobId, ...data } });
      } else if (data.workerId) {
        navigationRef.current?.navigate('EmployerDashboard');
      }
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}
