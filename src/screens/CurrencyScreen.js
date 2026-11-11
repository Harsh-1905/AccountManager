import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { getSetting, setSetting } from '../database/queries';
import { useFocusEffect } from '@react-navigation/native';

const CURRENCIES = [
  { country: 'India', code: 'INR', symbol: '₹' },
  { country: 'United States', code: 'USD', symbol: '$' },
  { country: 'Euro Zone', code: 'EUR', symbol: '€' },
  { country: 'United Kingdom', code: 'GBP', symbol: '£' },
  { country: 'Japan', code: 'JPY', symbol: '¥' },
  { country: 'China', code: 'CNY', symbol: '¥' },
  { country: 'Australia', code: 'AUD', symbol: 'A$' },
  { country: 'Canada', code: 'CAD', symbol: 'C$' },
  { country: 'Switzerland', code: 'CHF', symbol: 'Fr' },
  { country: 'Afghanistan', code: 'AFN', symbol: '؋' },
  { country: 'Albania', code: 'ALL', symbol: 'L' },
  { country: 'Algeria', code: 'DZD', symbol: 'دج' },
  { country: 'Argentina', code: 'ARS', symbol: '$' },
  { country: 'Bangladesh', code: 'BDT', symbol: '৳' },
  { country: 'Brazil', code: 'BRL', symbol: 'R$' },
  { country: 'Saudi Arabia', code: 'SAR', symbol: '﷼' },
  { country: 'UAE', code: 'AED', symbol: 'د.إ' },
  { country: 'Pakistan', code: 'PKR', symbol: '₨' },
  { country: 'Russia', code: 'RUB', symbol: '₽' },
  { country: 'South Korea', code: 'KRW', symbol: '₩' },
];

export default function CurrencyScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState('INR');

  useFocusEffect(
    React.useCallback(() => {
      const code = getSetting('currency_code');
      if (code) setSelectedCode(code);
    }, [])
  );

  const filtered = CURRENCIES.filter(
    (c) =>
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.includes(search)
  );

  const handleDone = () => {
    const selected = CURRENCIES.find((c) => c.code === selectedCode);
    if (selected) {
      setSetting('currency_code', selected.code);
      setSetting('currency_symbol', selected.symbol);
    }
    navigation.goBack();
  };

  const renderItem = ({ item }) => {
    const isSelected = item.code === selectedCode;
    return (
      <TouchableOpacity
        style={styles.currencyItem}
        onPress={() => setSelectedCode(item.code)}
        activeOpacity={0.7}
      >
        <View style={styles.radioOuter}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
        <View style={styles.currencyInfo}>
          <Text style={styles.countryName}>{item.country}</Text>
        </View>
        <Text style={styles.currencyCode}>
          {item.code} {item.symbol}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appBarBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Select currency</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search currency..."
          placeholderTextColor={Colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Done Button */}
      <View style={styles.doneContainer}>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>DONE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  appBar: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 4,
    elevation: 4,
  },
  appBarBtn: { padding: 10 },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 12,
  },
  clearBtn: { padding: 4 },
  list: { flex: 1 },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  currencyInfo: { flex: 1 },
  countryName: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  currencyCode: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  doneContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
