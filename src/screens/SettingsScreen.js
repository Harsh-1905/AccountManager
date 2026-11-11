import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Switch, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getSetting, setSetting } from '../database/queries';

const PRIMARY      = '#6200EE';
const PRIMARY_DARK = '#4A148C';

// ── Option row: label + description + set of chips ──────────────────────────
function OptionRow({ label, description, options, value, onChange }) {
  return (
    <View style={styles.optionBlock}>
      <Text style={styles.optionLabel}>{label}</Text>
      {description ? <Text style={styles.optionDesc}>{description}</Text> : null}
      <View style={styles.chips}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, value === opt.value && styles.chipActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Toggle row ───────────────────────────────────────────────────────────────
function ToggleRow({ label, description, value, onChange }) {
  return (
    <View style={styles.toggleBlock}>
      <View style={styles.toggleInfo}>
        <Text style={styles.optionLabel}>{label}</Text>
        {description ? <Text style={styles.optionDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#DDD', true: PRIMARY + '88' }}
        thumbColor={value ? PRIMARY : '#aaa'}
      />
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const [txSort,         setTxSort]         = useState('desc');
  const [accountSort,    setAccountSort]    = useState('recent');
  const [backupReminder, setBackupReminder] = useState('off');
  const [defaultTxType,  setDefaultTxType]  = useState('credit');

  useFocusEffect(
    useCallback(() => {
      setTxSort(        getSetting('tx_sort')          || 'desc');
      setAccountSort(   getSetting('account_sort')     || 'recent');
      setBackupReminder(getSetting('backup_reminder')  || 'off');
      setDefaultTxType( getSetting('default_tx_type')  || 'credit');
    }, [])
  );

  const save = (key, value) => {
    setSetting(key, value);
  };

  const handleTxSort = (v) => {
    setTxSort(v);
    save('tx_sort', v);
  };

  const handleAccountSort = (v) => {
    setAccountSort(v);
    save('account_sort', v);
  };

  const handleBackupReminder = (v) => {
    setBackupReminder(v);
    save('backup_reminder', v);
    if (v !== 'off') {
      Alert.alert(
        'Backup Reminder Set',
        `You'll be reminded to take a backup ${v}.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDefaultTxType = (v) => {
    setDefaultTxType(v);
    save('default_tx_type', v);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />

      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appBarBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Transactions ── */}
        <Text style={styles.sectionHeader}>Transactions</Text>
        <View style={styles.card}>
          <OptionRow
            label="Transaction Sort Order"
            description="Order in which transactions appear in the ledger"
            value={txSort}
            onChange={handleTxSort}
            options={[
              { label: 'Newest First', value: 'desc' },
              { label: 'Oldest First', value: 'asc'  },
            ]}
          />
          <View style={styles.cardDivider} />
          <OptionRow
            label="Default Transaction Type"
            description="Pre-selected type when adding a new transaction"
            value={defaultTxType}
            onChange={handleDefaultTxType}
            options={[
              { label: 'Credit', value: 'credit' },
              { label: 'Debit',  value: 'debit'  },
            ]}
          />
        </View>

        {/* ── Dashboard ── */}
        <Text style={styles.sectionHeader}>Dashboard</Text>
        <View style={styles.card}>
          <OptionRow
            label="Account Sort Order"
            description="Order in which accounts appear on the Dashboard"
            value={accountSort}
            onChange={handleAccountSort}
            options={[
              { label: 'Recently Added', value: 'recent'  },
              { label: 'A → Z',          value: 'name'    },
              { label: 'Highest Balance',value: 'balance' },
            ]}
          />
        </View>

        {/* ── Backup ── */}
        <Text style={styles.sectionHeader}>Backup</Text>
        <View style={styles.card}>
          <OptionRow
            label="Backup Reminder"
            description="Get reminded to back up your data"
            value={backupReminder}
            onChange={handleBackupReminder}
            options={[
              { label: 'Off',     value: 'off'     },
              { label: 'Daily',   value: 'daily'   },
              { label: 'Weekly',  value: 'weekly'  },
              { label: 'Monthly', value: 'monthly' },
            ]}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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

  content: { padding: 16 },

  sectionHeader: {
    fontSize: 12, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 20, marginBottom: 8, marginLeft: 4,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 10,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 4,
    overflow: 'hidden',
  },
  cardDivider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 16 },

  optionBlock: { padding: 16 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 3 },
  optionDesc:  { fontSize: 12, color: '#888', marginBottom: 10, lineHeight: 17 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#DDD',
    backgroundColor: '#F5F5F5',
  },
  chipActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },

  toggleBlock: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  toggleInfo: { flex: 1, marginRight: 12 },
});
