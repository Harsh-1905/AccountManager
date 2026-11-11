import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { getReportData, getSetting } from '../database/queries';

export default function ReportsScreen({ navigation }) {
  const [reportData, setReportData] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [totals, setTotals] = useState({ credit: 0, debit: 0, balance: 0 });

  useFocusEffect(
    useCallback(() => {
      const data = getReportData();
      setReportData(data);
      const sym = getSetting('currency_symbol');
      if (sym) setCurrencySymbol(sym);

      const totalCredit = data.reduce((s, r) => s + (r.total_credit || 0), 0);
      const totalDebit = data.reduce((s, r) => s + (r.total_debit || 0), 0);
      setTotals({ credit: totalCredit, debit: totalDebit, balance: totalCredit - totalDebit });
    }, [])
  );

  const fmt = (val) => (parseFloat(val) || 0).toFixed(2);

  const renderRow = ({ item, index }) => (
    <View style={[styles.row, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
      <View style={styles.accountNameCell}>
        <Text style={styles.accountNameText} numberOfLines={2}>{item.name}</Text>
      </View>
      <View style={styles.amountCell}>
        <Text style={styles.creditText}>{currencySymbol}{fmt(item.total_credit)}</Text>
      </View>
      <View style={styles.amountCell}>
        <Text style={styles.debitText}>{currencySymbol}{fmt(item.total_debit)}</Text>
      </View>
      <View style={[styles.amountCell, styles.balanceCell]}>
        <Text style={[
          styles.balanceText,
          item.balance >= 0 ? styles.balancePositive : styles.balanceNegative,
        ]}>
          {currencySymbol}{fmt(item.balance)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appBarBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Reports</Text>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View style={styles.accountNameCell}>
          <Text style={styles.headerText}>Account</Text>
        </View>
        <View style={styles.amountCell}>
          <Text style={styles.headerText}>Credit</Text>
        </View>
        <View style={styles.amountCell}>
          <Text style={styles.headerText}>Debit</Text>
        </View>
        <View style={[styles.amountCell, styles.balanceCell]}>
          <Text style={styles.headerText}>Balance</Text>
        </View>
      </View>

      {/* Report List */}
      <FlatList
        data={reportData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRow}
        style={styles.list}
        contentContainerStyle={
          reportData.length === 0 ? styles.emptyContent : { paddingBottom: 80 }
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtitle}>Add accounts and transactions to see reports.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Totals footer */}
      {reportData.length > 0 && (
        <View style={styles.totalsBar}>
          <View style={styles.accountNameCell}>
            <Text style={styles.totalsLabel}>TOTAL</Text>
          </View>
          <View style={styles.amountCell}>
            <Text style={styles.creditText}>{currencySymbol}{fmt(totals.credit)}</Text>
          </View>
          <View style={styles.amountCell}>
            <Text style={styles.debitText}>{currencySymbol}{fmt(totals.debit)}</Text>
          </View>
          <View style={[styles.amountCell, styles.balanceCell, styles.balanceTotalsCell]}>
            <Text style={styles.balanceTotalsText}>{currencySymbol}{fmt(totals.balance)}</Text>
          </View>
        </View>
      )}
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
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryDark,
    paddingVertical: 10,
  },
  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowEven: { backgroundColor: Colors.surface },
  rowOdd: { backgroundColor: '#FAFAFA' },
  accountNameCell: {
    flex: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.divider,
  },
  amountCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.divider,
  },
  balanceCell: {
    borderRightWidth: 0,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  accountNameText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  creditText: {
    fontSize: 13,
    color: Colors.credit,
    fontWeight: '600',
  },
  debitText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  balancePositive: { color: Colors.credit },
  balanceNegative: { color: Colors.error },
  totalsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderTopWidth: 2,
    borderTopColor: Colors.primaryDark,
    paddingVertical: 10,
  },
  totalsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  balanceTotalsCell: {
    backgroundColor: 'transparent',
  },
  balanceTotalsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContent: { flex: 1 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
