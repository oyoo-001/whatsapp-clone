import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import useAuthStore from '../store/authStore';
import { Colors } from '../constants';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import CallScreen from '../screens/CallScreen';
import MeetingScreen from '../screens/MeetingScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.white },
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen
              name="Call"
              component={CallScreen}
              options={{
                animation: 'slide_from_bottom',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="Meeting"
              component={MeetingScreen}
              options={{
                animation: 'slide_from_bottom',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
