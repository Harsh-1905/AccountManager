// AddTransactionScreen.js
// This component is now a reusable modal dialog component.
// It is embedded inside AccountDetailScreen directly.
// This file remains for backward compatibility but is not used in the new navigation.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Keyboard, Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { createTransaction } from '../database/queries';

/**
 * AddTransactionModal - inline modal for adding transactions.
 * Props:
 *  - visible: bool
 *  - onClose: fn
 *  - onSaved: fn
 *  - accountId: number
 *  - currencySymbol: string
 */
export default function AddTransactionModal({
  visible,
  onClose,
  onSaved,
  accountId,
  currencySymbol = '₹',
}) {
  const [particular, setParticular] = useState('');
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState('credit');

  const handleSave = () => {
    const trimParticular = particular.trim();
    const parsedAmount = parseFloat(amount);
    if (!trimParticular) {
      Alert.alert('Error', 'Please enter a particular/description.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    createTransaction(accountId, trimParticular, parsedAmount, txType, today);
    setParticular('');
    setAmount('');
    setTxType('credit');
    if (onSaved) onSaved();
    if (onClose) onClose();
  };

  const handleClose = () => {
    setParticular('');
    setAmount('');
    setTxType('credit');
    if (onClose) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => { Keyboard.dismiss(); handleClose(); }}
      >
        <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderText}>Add transaction</Text>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Particular</Text>
            <TextInput
              style={styles.textInput}
              value={particular}
              onChangeText={setParticular}
              placeholder="Description"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Amount</Text>
            <TextInput
              style={styles.textInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'credit' && styles.typeBtnActive]}
                onPress={() => setTxType('credit')}
              >
                <Text style={[styles.typeBtnText, txType === 'credit' && styles.typeBtnTextActive]}>
                  Credit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'debit' && styles.typeBtnActiveDebit]}
                onPress={() => setTxType('debit')}
              >
                <Text style={[styles.typeBtnText, txType === 'debit' && styles.typeBtnTextActive]}>
                  Debit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>SAVE</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    elevation: 8,
  },
  modalHeader: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalHeaderText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  modalBody: { padding: 20, paddingBottom: 8 },
  inputLabel: {
    fontSize: 13,
    color: Colors.labelColor,
    marginBottom: 6,
    fontWeight: '500',
  },
  textInput: {
    fontSize: 16,
    color: Colors.text,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.inputBorder,
    paddingVertical: 6,
    paddingHorizontal: 0,
    marginBottom: 4,
  },
  typeToggleRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnActiveDebit: { backgroundColor: Colors.error, borderColor: Colors.error },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  typeBtnTextActive: { color: '#FFFFFF' },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  cancelBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
