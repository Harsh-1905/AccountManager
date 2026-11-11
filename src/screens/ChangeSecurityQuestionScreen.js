import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, StatusBar, Alert, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getSetting, setSetting } from '../database/queries';

const PRIMARY      = '#6200EE';
const PRIMARY_DARK = '#4A148C';

const SECURITY_QUESTIONS = [
  'What was the first mobile that you purchased?',
  'What was the name of your best friend at childhood?',
  'What was the name of your first pet?',
  "What is your favourite children's book?",
  'What was the first film you saw in the cinema?',
  'What was the name of your favourite teacher at primary school?',
  'What is the name of your favourite sports team?',
  'What was the street you grew up on?',
  "What is your mother's maiden name?",
  'What city were you born in?',
];

export default function ChangeSecurityQuestionScreen({ navigation }) {
  const [question1, setQuestion1] = useState('');
  const [answer1,   setAnswer1]   = useState('');
  const [question2, setQuestion2] = useState('');
  const [answer2,   setAnswer2]   = useState('');
  const [showQ1, setShowQ1] = useState(false);
  const [showQ2, setShowQ2] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setQuestion1(getSetting('security_question_1') || '');
      setAnswer1(  getSetting('security_answer_1')   || '');
      setQuestion2(getSetting('security_question_2') || '');
      setAnswer2(  getSetting('security_answer_2')   || '');
    }, [])
  );

  const handleSave = () => {
    if (!question1 || !answer1.trim() || !question2 || !answer2.trim()) {
      Alert.alert('Required', 'Please select both questions and fill in your answers.');
      return;
    }
    if (question1 === question2) {
      Alert.alert('Duplicate', 'Please select two different questions.');
      return;
    }
    setSetting('security_question_1', question1);
    setSetting('security_answer_1',   answer1.trim());
    setSetting('security_question_2', question2);
    setSetting('security_answer_2',   answer2.trim());
    Alert.alert('Success', 'Security questions updated!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const QuestionPicker = ({ visible, onClose, selected, onSelect }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Question</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {SECURITY_QUESTIONS.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.pickerItem, selected === q && styles.pickerItemSelected]}
                onPress={() => { onSelect(q); onClose(); }}
              >
                <Text style={[styles.pickerItemText, selected === q && styles.pickerItemTextSelected]}>
                  {q}
                </Text>
                {selected === q && <Ionicons name="checkmark" size={18} color={PRIMARY} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />

      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appBarBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Change Security Questions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color={PRIMARY} style={{ marginRight: 8 }} />
          <Text style={styles.infoText}>
            Security questions are used to recover your password if you forget it.
          </Text>
        </View>

        {/* Question 1 */}
        <Text style={styles.sectionLabel}>Security Question 1</Text>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowQ1(true)}>
          <Text style={[styles.dropdownText, !question1 && styles.placeholder]} numberOfLines={2}>
            {question1 || 'Select a question...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#888" />
        </TouchableOpacity>
        <Text style={styles.answerLabel}>Answer</Text>
        <TextInput
          style={styles.input}
          value={answer1}
          onChangeText={setAnswer1}
          placeholder="Your answer"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
        />

        {/* Question 2 */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Security Question 2</Text>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowQ2(true)}>
          <Text style={[styles.dropdownText, !question2 && styles.placeholder]} numberOfLines={2}>
            {question2 || 'Select a question...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#888" />
        </TouchableOpacity>
        <Text style={styles.answerLabel}>Answer</Text>
        <TextInput
          style={styles.input}
          value={answer2}
          onChangeText={setAnswer2}
          placeholder="Your answer"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
        />

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>EXIT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>SAVE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <QuestionPicker visible={showQ1} onClose={() => setShowQ1(false)} selected={question1} onSelect={setQuestion1} />
      <QuestionPicker visible={showQ2} onClose={() => setShowQ2(false)} selected={question2} onSelect={setQuestion2} />
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#F5F5F5' },
  appBar:    { backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', paddingTop: 40, paddingBottom: 12, paddingHorizontal: 4, elevation: 4 },
  appBarBtn: { padding: 10 },
  appBarTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginLeft: 4, flex: 1 },
  content:   { padding: 20, paddingBottom: 48 },
  infoBox:   { flexDirection: 'row', backgroundColor: '#EDE7F6', borderRadius: 8, padding: 12, marginBottom: 20, alignItems: 'flex-start' },
  infoText:  { flex: 1, fontSize: 13, color: PRIMARY, lineHeight: 18 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  answerLabel:  { fontSize: 12, color: '#E57373', marginTop: 10, marginBottom: 6, fontWeight: '500' },
  dropdownBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#DDD', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  dropdownText: { flex: 1, fontSize: 14, color: '#333', marginRight: 8 },
  placeholder:  { color: '#aaa' },
  input:        { fontSize: 15, color: '#111', borderBottomWidth: 1.5, borderBottomColor: '#E0E0E0', paddingVertical: 8 },
  btnRow:       { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 32, gap: 12 },
  cancelBtn:    { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, borderWidth: 1.5, borderColor: PRIMARY },
  cancelText:   { color: PRIMARY, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  saveBtn:      { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, backgroundColor: PRIMARY },
  saveText:     { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  pickerOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet:     { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', overflow: 'hidden' },
  pickerHeader:    { backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  pickerTitle:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  pickerItem:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  pickerItemSelected:     { backgroundColor: '#EDE7F6' },
  pickerItemText:         { flex: 1, fontSize: 14, color: '#333', marginRight: 8 },
  pickerItemTextSelected: { color: PRIMARY, fontWeight: '600' },
});
