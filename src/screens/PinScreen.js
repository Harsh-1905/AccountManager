import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const PIN_LENGTH = 4;

export default function PinScreen({ onSuccess, onForgot, storedPin }) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  const handlePress = (val) => {
    if (val === 'back') {
      setPin((p) => p.slice(0, -1));
    } else if (val === 'ok') {
      if (pin.length < PIN_LENGTH) return;
      if (pin === storedPin) {
        onSuccess();
      } else {
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 500);
        Alert.alert('Wrong PIN', 'The PIN you entered is incorrect.');
      }
    } else {
      if (pin.length < PIN_LENGTH) {
        setPin((p) => p + val);
      }
    }
  };

  const numpadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['back', '0', 'ok'],
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* Top purple half */}
      <View style={styles.topSection}>
        <View style={styles.iconCircle}>
          <Ionicons name="book" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.appTitle}>Account Manager</Text>
        <TouchableOpacity onPress={onForgot} style={styles.forgotBtn}>
          <Text style={styles.forgotText}>FORGOT PASSWORD?</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom white half */}
      <View style={styles.bottomSection}>
        {/* PIN dots */}
        <View style={[styles.dotsRow, shake && styles.shake]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < pin.length ? styles.dotFilled : styles.dotEmpty,
              ]}
            />
          ))}
        </View>

        {/* Numpad */}
        <View style={styles.numpad}>
          {numpadRows.map((row, ri) => (
            <View key={ri} style={styles.numpadRow}>
              {row.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.numpadKey}
                  onPress={() => handlePress(key)}
                  activeOpacity={0.7}
                >
                  {key === 'back' ? (
                    <Ionicons name="backspace-outline" size={26} color={Colors.text} />
                  ) : key === 'ok' ? (
                    <Text style={styles.okText}>OK</Text>
                  ) : (
                    <Text style={styles.numText}>{key}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primary },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingTop: 40,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  forgotBtn: { padding: 8 },
  forgotText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
  },
  bottomSection: {
    flex: 1.2,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 16,
  },
  shake: {
    // Simple visual feedback - would need Animated for real shake
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: Colors.primary,
  },
  numpad: {
    width: '80%',
    maxWidth: 280,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  numpadKey: {
    width: 72,
    height: 56,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  numText: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text,
  },
  okText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
});
