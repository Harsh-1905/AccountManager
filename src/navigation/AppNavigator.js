import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { getSetting } from '../database/queries';

import DashboardScreen from '../screens/DashboardScreen';
import AccountDetailScreen from '../screens/AccountDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ChangeSecurityQuestionScreen from '../screens/ChangeSecurityQuestionScreen';
import CurrencyScreen from '../screens/CurrencyScreen';
import ReportsScreen from '../screens/ReportsScreen';
import PinScreen from '../screens/PinScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

import ManageEventsScreen from '../screens/ManageEventsScreen';

const Stack = createStackNavigator();

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard"              component={DashboardScreen} />
      <Stack.Screen name="AccountDetail"          component={AccountDetailScreen} />
      <Stack.Screen name="Settings"               component={SettingsScreen} />
      <Stack.Screen name="ChangePassword"         component={ChangePasswordScreen} />
      <Stack.Screen name="ChangeSecurityQuestion" component={ChangeSecurityQuestionScreen} />
      <Stack.Screen name="Currency"               component={CurrencyScreen} />
      <Stack.Screen name="Reports"                component={ReportsScreen} />
      <Stack.Screen name="ManageEvents"           component={ManageEventsScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const [pinChecked, setPinChecked]   = useState(false);
  const [storedPin, setStoredPin]     = useState(null);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [showForgot, setShowForgot]   = useState(false);

  const loadPin = () => {
    const pin = getSetting('pin');
    setStoredPin(pin || null);
    setPinChecked(true);
  };

  useEffect(() => {
    loadPin();
  }, []);

  if (!pinChecked) return null;

  // ── Show forgot password screen ──
  if (showForgot) {
    return (
      <ForgotPasswordScreen
        onBack={() => setShowForgot(false)}
        onResetSuccess={() => {
          // Reload the new PIN and go back to PIN entry screen
          loadPin();
          setShowForgot(false);
          setPinUnlocked(false);
        }}
      />
    );
  }

  // ── Show PIN entry if PIN is set and not yet unlocked ──
  if (storedPin && !pinUnlocked) {
    return (
      <PinScreen
        storedPin={storedPin}
        onSuccess={() => setPinUnlocked(true)}
        onForgot={() => setShowForgot(true)}
      />
    );
  }

  // ── Main app ──
  return (
    <NavigationContainer>
      <MainStack />
    </NavigationContainer>
  );
}
