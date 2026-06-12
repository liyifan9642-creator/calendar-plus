import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { VoiceScreen } from './src/screens/VoiceScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { databaseService } from './src/services/database';
import { Colors, Gradients, Typography, Radius, Shadows } from './src/theme';

const Tab = createBottomTabNavigator();

export default function App() {
  useEffect(() => {
    databaseService.getDatabase().catch(console.error);
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'calendar';
            if (route.name === '日历') iconName = focused ? 'calendar' : 'calendar-outline';
            else if (route.name === '语音助手') iconName = focused ? 'mic' : 'mic-outline';
            else if (route.name === '设置') iconName = focused ? 'settings' : 'settings-outline';
            return (
              <View style={focused ? styles.iconFocused : undefined}>
                <Ionicons name={iconName} size={focused ? 24 : size} color={color} />
              </View>
            );
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textTertiary,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 0.5,
            height: 60,
            paddingBottom: 8,
            paddingTop: 4,
            ...Shadows.small,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 2,
          },
        })}
      >
        <Tab.Screen name="日历" component={CalendarScreen} />
        <Tab.Screen name="语音助手" component={VoiceScreen} />
        <Tab.Screen name="设置" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconFocused: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.full,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
