import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { VoiceScreen } from './src/screens/VoiceScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { databaseService } from './src/services/database';

const Tab = createBottomTabNavigator();

export default function App() {
  useEffect(() => {
    // Initialize database on app start
    databaseService.getDatabase().catch(console.error);
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'calendar';
            if (route.name === '日历') iconName = focused ? 'calendar' : 'calendar-outline';
            else if (route.name === '语音助手') iconName = focused ? 'mic' : 'mic-outline';
            else if (route.name === '设置') iconName = focused ? 'settings' : 'settings-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: 'gray',
          headerStyle: { backgroundColor: '#2196F3' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        })}
      >
        <Tab.Screen name="日历" component={CalendarScreen} options={{ headerTitle: 'VoiceCal 日历' }} />
        <Tab.Screen name="语音助手" component={VoiceScreen} options={{ headerTitle: '语音助手' }} />
        <Tab.Screen name="设置" component={SettingsScreen} options={{ headerTitle: '设置' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
