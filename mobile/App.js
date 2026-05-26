import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import useAuthStore from './src/store/authStore';
import socketService from './src/services/socket';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/constants';

const App = () => {
  const { isLoading, loadUser, token } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (token) {
      socketService.connect(token);
    }
  }, [token]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return <AppNavigator />;
};

export default App;
