import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, StatusBar, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSetting, setSetting } from '../database/queries';

const PRIMARY      = '#6200EE';
const PRIMARY_DARK = '#4A148C';

export default function ForgotPasswordScreen({ onBack, onResetSuccess }) {
  const [question1, setQuestion1] = useState('');
  const [question2, setQuestion2] = useState('');
  const [answer1, setAnswer1]     = useState('');
  const [answer2, setAnswer2]     = useState('');
  const [userAnswer1, setUserAnswer1] = useState('');
  const [userAnswer2, setUserAnswer2] = useState('');
  const [hasQuestions, setHasQuestions] = useState(false);

  // Step: 'verify' = answering questions, 'reset' = setting new PIN
  const [step, setStep] = useState('verify');
  const [newPin, setNewPin]         = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin]         = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  useEffect(() => {
    const q1 = getSetting('security_question_1');
    const q2 = getSetting('security_question_2');
    const a1 = getSetting('security_answer_1');
    const a2 = getSetting('security_answer_2');
    if (q1 && q2 && a1 && a2) {
      setQuestion1(q1); setQuestion2(q2);
      setAnswer1(a1);   setAnswer2(a2);
      setHasQuestions(true);
    }
  }, []);

  const handleVerify = () => {
    if (!userAnswer1.trim() || !userAnswer2.trim()) {
      Alert.alert('Required', 'Please answer both security questions.');
      return;
    }
    const match1 = userAnswer1.trim().toLowerCase() === answer1.trim().toLowerCase();
    const match2 = userAnswer2.trim().toLowerCase() === answer2.trim().toLowerCase();
    if (match1 && match2) {
      setStep('reset');
    } else {
      Alert.alert('Incorrect', 'One or both answers are wrong. Please try again.');
      setUserAnswer1('');
      setUserAnswer2('');
    }
  };

  const handleResetPin = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Mismatch', 'PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }
    setSetting('pin', newPin);
    Alert.alert('Success', 'Your PIN has been reset successfully!', [
      { text: 'OK', onPress: onResetSuccess },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'verify' ? 'Forgot Password' : 'Reset PIN'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ── No security questions set ── */}
        {!hasQuestions && (
          <View style={styles.noQCard}>
            <Ionicons name="warning-outline" size={48} color="#E57373" style={{ marginBottom: 14 }} />
            <Text style={styles.noQTitle}>Cannot Reset Password</Text>
            <Text style={styles.noQBody}>
              No security questions have been set up for this account.
              {'\n\n'}
              To recover your password, you will need to uninstall and reinstall the app.
              {'\n\n'}
              To prevent this in future, go to Settings and set up security questions.
            </Text>
            <TouchableOpacity style={styles.backBtnLarge} onPress={onBack}>
              <Text style={styles.backBtnLargeText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 1: Answer security questions ── */}
        {hasQuestions && step === 'verify' && (
          <>
            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color={PRIMARY} style={{ marginRight: 8 }} />
              <Text style={styles.infoText}>
                Answer your security questions to verify your identity.
              </Text>
            </View>

            <Text style={styles.questionLabel}>Security Question 1</Text>
            <Text style={styles.questionText}>{question1}</Text>
            <TextInput
              style={styles.input}
              value={userAnswer1}
              onChangeText={setUserAnswer1}
              placeholder="Your answer"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
            />

            <Text style={[styles.questionLabel, { marginTop: 24 }]}>Security Question 2</Text>
            <Text style={styles.questionText}>{question2}</Text>
            <TextInput
              style={styles.input}
              value={userAnswer2}
              onChangeText={setUserAnswer2}
              placeholder="Your answer"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
            />

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onBack}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleVerify}>
                <Text style={styles.primaryText}>VERIFY</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Step 2: Set new PIN ── */}
        {hasQuestions && step === 'reset' && (
          <>
            <View style={styles.infoBox}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#388E3C" style={{ marginRight: 8 }} />
              <Text style={[styles.infoText, { color: '#388E3C' }]}>
                Identity verified! Now set your new PIN.
              </Text>
            </View>

            <Text style={styles.questionLabel}>New PIN</Text>
            <View style={styles.pinRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newPin}
                onChangeText={setNewPin}
                placeholder="Enter 4-digit PIN"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry={!showNewPin}
              />
              <TouchableOpacity onPress={() => setShowNewPin(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showNewPin ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.questionLabel, { marginTop: 20 }]}>Confirm PIN</Text>
            <View style={styles.pinRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Re-enter PIN"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry={!showConfirmPin}
              />
              <TouchableOpacity onPress={() => setShowConfirmPin(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showConfirmPin ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('verify')}>
                <Text style={styles.cancelText}>BACK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPin}>
                <Text style={styles.primaryText}>RESET PIN</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center',
    paddingTop: 40, paddingBottom: 14, paddingHorizontal: 4, elevation: 4,
  },
  backBtn: { padding: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginLeft: 4 },

  content: { padding: 20, paddingBottom: 48 },

  noQCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 24,
    alignItems: 'center', marginTop: 24, elevation: 2,
  },
  noQTitle: { fontSize: 17, fontWeight: '700', color: '#C62828', marginBottom: 12 },
  noQBody: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22 },
  backBtnLarge: {
    marginTop: 24, paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 20, borderWidth: 1.5, borderColor: PRIMARY,
  },
  backBtnLargeText: { color: PRIMARY, fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },

  infoBox: {
    flexDirection: 'row', backgroundColor: '#EDE7F6', borderRadius: 8,
    padding: 12, marginBottom: 20, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: PRIMARY, lineHeight: 18 },

  questionLabel: { fontSize: 13, color: '#E57373', fontWeight: '600', marginBottom: 4 },
  questionText: {
    fontSize: 14, color: '#333', marginBottom: 8, lineHeight: 20,
    backgroundColor: '#fff', padding: 10, borderRadius: 6,
    borderLeftWidth: 3, borderLeftColor: PRIMARY,
  },
  input: {
    fontSize: 15, color: '#111', borderBottomWidth: 1.5,
    borderBottomColor: '#E0E0E0', paddingVertical: 8, marginBottom: 4,
    backgroundColor: 'transparent',
  },
  pinRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { padding: 6, marginBottom: 4 },

  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 32, gap: 12 },
  cancelBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 20, borderWidth: 1.5, borderColor: PRIMARY,
  },
  cancelText: { color: PRIMARY, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  primaryBtn: {
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 20, backgroundColor: PRIMARY,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
});
