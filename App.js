import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from './src/database/db';
import { Colors } from './src/theme/colors';

export default function App() {
  const [ready, setReady] = useState(false);
  const [AppNavigator, setAppNavigator] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        initDatabase();
        // Lazy-import navigator AFTER DB is ready and gesture handler is mounted
        const mod = await import('./src/navigation/AppNavigator');
        setAppNavigator(() => mod.default);
        setReady(true);
      } catch (e) {
        console.error('DB init error:', e);
        setError(e.message);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <GestureHandlerRootView style={styles.flex}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to initialize database:</Text>
          <Text style={styles.errorMsg}>{error}</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (!ready) {
    return (
      <GestureHandlerRootView style={styles.flex}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Account Manager...</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      {AppNavigator ? (
        <AppNavigator />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
