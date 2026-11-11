import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSetting, setSetting } from '../database/queries';

const PRIMARY      = '#6200EE';
const PRIMARY_DARK = '#4A148C';

export default function ChangePasswordScreen({ navigation }) {
  const [step, setStep] = useState('verify'); // 'verify' | 'new'

  const [currentInput, setCurrentInput]   = useState('');
  const [showCurrent, setShowCurrent]     = useState(false);

  const [newPin, setNewPin]               = useState('');
  const [confirmPin, setConfirmPin]       = useState('');
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  const handleVerify = () => {
    const storedPin = getSetting('pin');
    if (!storedPin) {
      // No PIN set — go straight to setting one
      setStep('new');
      return;
    }
    if (!currentInput.trim()) {
      Alert.alert('Required', 'Please enter your current password.');
      return;
    }
    if (currentInput !== storedPin) {
      Alert.alert('Incorrect', 'Current password is wrong. Please try again.');
      setCurrentInput('');
      return;
    }
    setStep('new');
  };

  const handleSave = () => {
    if (!newPin.trim() || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      Alert.alert('Invalid', 'New password must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Mismatch', 'Passwords do not match. Please try again.');
      setConfirmPin('');
      return;
    }
    setSetting('pin', newPin);
    Alert.alert('Success', 'Password changed successfully!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />

      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appBarBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Change Password</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {step === 'verify' ? 'Enter Current Password' : 'Set New Password'}
            </Text>
          </View>

          <View style={styles.cardBody}>
            {step === 'verify' && (
              <>
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.pinRow}>
                  <TextInput
                    style={styles.input}
                    value={currentInput}
                    onChangeText={setCurrentInput}
                    placeholder="Enter 4-digit PIN"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showCurrent}
                    keyboardType="numeric"
                    maxLength={4}
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={styles.eye}>
                    <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {step === 'new' && (
              <>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.pinRow}>
                  <TextInput
                    style={styles.input}
                    value={newPin}
                    onChangeText={setNewPin}
                    placeholder="Enter new 4-digit PIN"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showNew}
                    keyboardType="numeric"
                    maxLength={4}
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eye}>
                    <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { marginTop: 20 }]}>Confirm Password</Text>
                <View style={styles.pinRow}>
                  <TextInput
                    style={styles.input}
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                    placeholder="Re-enter new PIN"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showConfirm}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eye}>
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.helper}>Password must be exactly 4 digits.</Text>
              </>
            )}
          </View>

          <View style={styles.cardButtons}>
            {step === 'new' && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('verify')}>
                <Text style={styles.cancelText}>BACK</Text>
              </TouchableOpacity>
            )}
            {step === 'verify' && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={step === 'verify' ? handleVerify : handleSave}
            >
              <Text style={styles.saveText}>{step === 'verify' ? 'NEXT' : 'SAVE'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  appBar: {
    backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center',
    paddingTop: 40, paddingBottom: 12, paddingHorizontal: 4, elevation: 4,
  },
  appBarBtn: { padding: 10 },
  appBarTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginLeft: 4 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, width: '100%',
    maxWidth: 360, overflow: 'hidden', elevation: 4,
  },
  cardHeader: { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 14 },
  cardTitle:  { color: '#fff', fontSize: 17, fontWeight: '600' },
  cardBody:   { padding: 20, paddingBottom: 8 },
  label:      { fontSize: 13, color: '#E57373', marginBottom: 8, fontWeight: '500' },
  pinRow:     { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1, fontSize: 16, color: '#111',
    borderBottomWidth: 1.5, borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
  },
  eye:        { padding: 6 },
  helper:     { fontSize: 12, color: '#aaa', marginTop: 6 },
  cardButtons: {
    flexDirection: 'row', justifyContent: 'flex-end',
    padding: 12, gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: PRIMARY,
  },
  cancelText: { color: PRIMARY, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  saveBtn:    { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: PRIMARY },
  saveText:   { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
});
