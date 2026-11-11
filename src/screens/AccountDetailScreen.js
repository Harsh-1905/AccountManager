import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Modal, TextInput, Alert, Keyboard, ScrollView,
  Animated, PanResponder,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  getAccountById, getTransactionsByAccount, getAccountSummary,
  createTransaction, updateTransaction, deleteTransaction, getSetting,
  getAllEvents,
} from '../database/queries';

const PRIMARY      = '#6200EE';
const PRIMARY_DARK = '#4A148C';
const TEAL         = '#00ACC1';
const ERROR        = '#C62828';
const SWIPE_THRESHOLD = 80;

// ── Utility ──────────────────────────────────────────────────────────────────
const toDisplayDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y?.slice(2)}`;
};

const toISODate = (date) => {
  if (!date) return new Date().toISOString().split('T')[0];
  if (typeof date === 'string') return date.split('T')[0];
  if (date instanceof Date && !isNaN(date.getTime())) return date.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
};

// Always returns a valid Date object — never a string, never Invalid Date
const toSafeDate = (val) => {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'string' && val) {
    // append time to avoid UTC midnight rollback on some Android engines
    const d = new Date(val.split('T')[0] + 'T12:00:00');
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
};

// ── Swipeable row ─────────────────────────────────────────────────────────────
function SwipeableRow({ children, onDelete }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rowHeight  = useRef(new Animated.Value(1)).current; // scale for collapse
  const [swiped, setSwiped] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          // Snap open to show delete button
          Animated.spring(translateX, { toValue: -80, useNativeDriver: true }).start();
          setSwiped(true);
        } else {
          // Snap back
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          setSwiped(false);
        }
      },
    })
  ).current;

  const closeRow = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setSwiped(false);
  };

  const confirmDelete = () => {
    closeRow();
    onDelete();
  };

  return (
    <View style={sw.container}>
      {/* Red delete action behind the row */}
      <View style={sw.deleteAction}>
        <TouchableOpacity style={sw.deleteBtn} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={sw.deleteTxt}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable content */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {/* Tap anywhere on open row to close it */}
        {swiped
          ? <TouchableOpacity activeOpacity={1} onPress={closeRow}>{children}</TouchableOpacity>
          : children}
      </Animated.View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AccountDetailScreen({ navigation, route }) {
  const { accountId } = route.params;
  const [account, setAccount]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary]           = useState({ credit: 0, debit: 0, balance: 0 });
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [particular, setParticular]     = useState('');
  const [event, setEvent]               = useState('');
  const [amount, setAmount]             = useState('');
  const [txType, setTxType]             = useState('credit');
  const [txDate, setTxDate]             = useState(toSafeDate(null));
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);
  const [showEventDrop, setShowEventDrop]         = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal]   = useState(false);
  const [editingTx, setEditingTx]           = useState(null);
  const [editParticular, setEditParticular] = useState('');
  const [editEvent, setEditEvent]           = useState('');
  const [editAmount, setEditAmount]         = useState('');
  const [editType, setEditType]             = useState('credit');
  const [editDate, setEditDate]             = useState(toSafeDate(null));
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditEventDrop, setShowEditEventDrop]   = useState(false);

  // Search & filter
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [filterEvent, setFilterEvent]     = useState(''); // '' = all

  // Three-dot menu
  const [showMenu, setShowMenu] = useState(false);

  // Settings-driven state
  const [txSort, setTxSort]         = useState('desc');
  const [eventOptions, setEventOptions] = useState([]);

  // Undo snackbar
  const [snackVisible, setSnackVisible]   = useState(false);
  const [deletedTx, setDeletedTx]         = useState(null);
  const snackTimer                        = useRef(null);
  const snackAnim                         = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(() => {
    const acc = getAccountById(accountId);
    if (acc) setAccount(acc);
    const sort = getSetting('tx_sort') || 'desc';
    setTxSort(sort);
    const defType = getSetting('default_tx_type') || 'credit';
    setTxType(defType);
    setTransactions(getTransactionsByAccount(accountId, sort));
    setSummary(getAccountSummary(accountId));
    const sym = getSetting('currency_symbol');
    if (sym) setCurrencySymbol(sym);
    setEventOptions(getAllEvents()); // full objects: { id, name, price, ... }
  }, [accountId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ── Filtered transactions ──
  const filteredTransactions = transactions.filter(tx => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q || (
      (tx.particular && tx.particular.toLowerCase().includes(q)) ||
      (tx.event      && tx.event.toLowerCase().includes(q))      ||
      (tx.date       && tx.date.includes(q))
    );
    const matchEvent = !filterEvent || tx.event === filterEvent;
    return matchSearch && matchEvent;
  });

  const fmt = (val) => (parseFloat(val) || 0).toFixed(2);

  // ── Snackbar helpers ──
  const showSnack = (tx) => {
    setDeletedTx(tx);
    setSnackVisible(true);
    Animated.timing(snackAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    if (snackTimer.current) clearTimeout(snackTimer.current);
    snackTimer.current = setTimeout(() => dismissSnack(), 4000);
  };

  const dismissSnack = () => {
    Animated.timing(snackAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setSnackVisible(false);
      setDeletedTx(null);
    });
  };

  const handleUndo = () => {
    if (!deletedTx) return;
    if (snackTimer.current) clearTimeout(snackTimer.current);
    // Re-insert the deleted transaction
    createTransaction(
      deletedTx.account_id,
      deletedTx.particular,
      deletedTx.event || null,
      deletedTx.amount,
      deletedTx.type,
      deletedTx.date,
    );
    dismissSnack();
    loadData();
  };

  // ── Export as Excel (CSV) ──
  const exportExcel = async () => {
    setShowMenu(false);
    try {
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const header = `Date,Particular,Event,Credit(${currencySymbol}),Debit(${currencySymbol})\n`;
      const rows = filteredTransactions.map(tx => [
        esc(tx.date),
        esc(tx.particular),
        esc(tx.event || ''),
        tx.type === 'credit' ? fmt(tx.amount) : '0',
        tx.type === 'debit'  ? fmt(tx.amount) : '0',
      ].join(',')).join('\n');
      const footer = `\n\nSummary\nCredit,${fmt(summary.credit)}\nDebit,${fmt(summary.debit)}\nBalance,${fmt(summary.balance)}`;
      const csv = '\uFEFF' + header + rows + footer;
      const safeName = (account?.name || 'ledger').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${safeName}_${new Date().toISOString().slice(0, 10)}.csv`;
      const dest = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(dest, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Export Excel/CSV' });
      } else {
        Alert.alert('Saved', `CSV saved to:\n${dest}`);
      }
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    }
  };

  // ── Add ──
  const handleAddTransaction = () => {
    const p = particular.trim();
    const a = parseFloat(amount);
    if (isNaN(a)||a<=0) { Alert.alert('Error', 'Please enter a valid amount.'); return; }
    createTransaction(accountId, p, event || null, a, txType, toISODate(txDate));
    setParticular(''); setEvent(''); setAmount('');
    setTxDate(toSafeDate(null)); setShowAddModal(false);
    loadData();
  };

  // ── Open edit ──
  const openEdit = (tx) => {
    setEditingTx(tx);
    setEditParticular(tx.particular);
    setEditEvent(tx.event || '');
    setEditAmount(tx.amount.toString());
    setEditType(tx.type);
    setEditDate(toSafeDate(tx.date));
    setShowEditModal(true);
  };

  // ── Save edit ──
  const handleSaveEdit = () => {
    const p = editParticular.trim();
    const a = parseFloat(editAmount);
    if (isNaN(a)||a<=0) { Alert.alert('Error', 'Please enter a valid amount.'); return; }
    updateTransaction(editingTx.id, p, editEvent || null, a, editType, toISODate(editDate));
    setShowEditModal(false);
    setEditingTx(null);
    loadData();
  };

  // ── Delete with undo ──
  const handleDelete = (tx) => {
    deleteTransaction(tx.id);
    loadData();
    showSnack(tx);
  };

  // ── Render row ──
  const renderTransaction = ({ item, index }) => (
    <SwipeableRow onDelete={() => handleDelete(item)}>
      <TouchableOpacity
        style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}
        onPress={() => openEdit(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.cell, styles.dateCell]}>
          <Text style={styles.cellTeal}>{toDisplayDate(item.date)}</Text>
        </View>
        <View style={[styles.cell, styles.particularCell]}>
          <Text style={styles.cellTeal} numberOfLines={1}>
            {item.particular || item.event || '—'}
          </Text>
          {item.event && item.particular ? <Text style={styles.eventTag}>{item.event}</Text> : null}
        </View>
        <View style={[styles.cell, styles.amountCell]}>
          <Text style={item.type === 'credit' ? styles.creditAmt : styles.dimAmt}>
            {item.type === 'credit' ? fmt(item.amount) : '0'}
          </Text>
        </View>
        <View style={[styles.cell, styles.amountCell, { borderRightWidth: 0 }]}>
          <Text style={item.type === 'debit' ? styles.debitAmt : styles.dimAmt}>
            {item.type === 'debit' ? fmt(item.amount) : '0'}
          </Text>
        </View>
      </TouchableOpacity>
    </SwipeableRow>
  );

  if (!account) return <View style={styles.root}><StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} /></View>;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />

      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appBarBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle} numberOfLines={1}>{account.name}</Text>
        <View style={styles.appBarRight}>
          <TouchableOpacity style={styles.appBarBtn} onPress={() => {
            setParticular(''); setEvent(''); setAmount('');
            setTxDate(toSafeDate(null)); setShowEventDrop(false);
            setShowAddDatePicker(false); setShowAddModal(true);
          }}>
            <Ionicons name="document-text-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.appBarBtn} onPress={() => { setSearchVisible(v => !v); setSearchQuery(''); }}>
            <Ionicons name={searchVisible ? 'close' : 'search'} size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.appBarBtn} onPress={() => setShowMenu(true)}>
            <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {searchVisible && (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by date, particular or event..."
            placeholderTextColor="#aaa"
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#aaa" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Event filter chips */}
      {eventOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          <TouchableOpacity
            style={[styles.chip, !filterEvent && styles.chipActive]}
            onPress={() => setFilterEvent('')}
          >
            <Text style={[styles.chipText, !filterEvent && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {eventOptions.map(opt => (
            <TouchableOpacity
              key={opt.name}
              style={[styles.chip, filterEvent === opt.name && styles.chipActive]}
              onPress={() => setFilterEvent(filterEvent === opt.name ? '' : opt.name)}
            >
              <Text style={[styles.chipText, filterEvent === opt.name && styles.chipTextActive]}>{opt.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Table header */}
      <View style={styles.tableHeader}>
        <View style={[styles.cell, styles.dateCell]}>
          <Text style={styles.headerText}>Date</Text>
        </View>
        <View style={[styles.cell, styles.particularCell]}>
          <Text style={styles.headerText}>Particular</Text>
        </View>
        <View style={[styles.cell, styles.amountCell]}>
          <Text style={styles.headerText}>Credit({currencySymbol})</Text>
        </View>
        <View style={[styles.cell, styles.amountCell, { borderRightWidth: 0 }]}>
          <Text style={styles.headerText}>Debit({currencySymbol})</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTransaction}
        style={styles.tableBody}
        contentContainerStyle={filteredTransactions.length === 0 ? styles.emptyContent : { paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name={searchQuery || filterEvent ? 'search-outline' : 'receipt-outline'} size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery || filterEvent ? 'No results found' : 'No transactions yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || filterEvent
                ? 'Try a different search or filter'
                : 'Tap the document icon to add one'}
            </Text>
          </View>
        }
      />

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Credit(↑)</Text>
          <Text style={styles.summaryValue}>{currencySymbol}{fmt(summary.credit)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Debit(↓)</Text>
          <Text style={styles.summaryValue}>{currencySymbol}{fmt(summary.debit)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={[styles.summaryItem, { backgroundColor: PRIMARY }]}>
          <Text style={[styles.summaryLabel, { color: 'rgba(255,255,255,0.85)' }]}>Balance</Text>
          <Text style={[styles.summaryValue, { color: '#fff' }]}>{currencySymbol}{fmt(summary.balance)}</Text>
        </View>
      </View>

      {/* Undo snackbar */}
      {snackVisible && (
        <Animated.View style={[styles.snackbar, { opacity: snackAnim, transform: [{ translateY: snackAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
          <Text style={styles.snackText}>Transaction deleted</Text>
          <TouchableOpacity onPress={handleUndo}>
            <Text style={styles.snackUndo}>UNDO</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Three-dot menu */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuRow} onPress={exportExcel}>
              <Ionicons name="grid-outline" size={20} color="#388E3C" style={{ marginRight: 12 }} />
              <Text style={styles.menuRowText}>Export as Excel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Modal */}
      <TxModal
        visible={showAddModal}
        title="Add transaction"
        particular={particular}
        event={event}
        amount={amount}
        txType={txType}
        txDate={txDate}
        showDrop={showEventDrop}
        showDatePicker={showAddDatePicker}
        eventOptions={eventOptions}
        currencySymbol={currencySymbol}
        onChangeParticular={setParticular}
        onChangeEvent={setEvent}
        onChangeAmount={setAmount}
        onChangeType={setTxType}
        onChangeDate={(d) => { setTxDate(d); setShowAddDatePicker(false); }}
        onToggleDrop={() => setShowEventDrop(v => !v)}
        onToggleDatePicker={() => setShowAddDatePicker(v => !v)}
        onCancel={() => { setShowAddModal(false); setShowEventDrop(false); setShowAddDatePicker(false); }}
        onSave={handleAddTransaction}
      />

      {/* Edit Modal */}
      <TxModal
        visible={showEditModal}
        title="Edit transaction"
        particular={editParticular}
        event={editEvent}
        amount={editAmount}
        txType={editType}
        txDate={editDate}
        showDrop={showEditEventDrop}
        showDatePicker={showEditDatePicker}
        eventOptions={eventOptions}
        currencySymbol={currencySymbol}
        dateReadOnly
        onChangeParticular={setEditParticular}
        onChangeEvent={setEditEvent}
        onChangeAmount={setEditAmount}
        onChangeType={setEditType}
        onChangeDate={(d) => { setEditDate(d); setShowEditDatePicker(false); }}
        onToggleDrop={() => setShowEditEventDrop(v => !v)}
        onToggleDatePicker={() => setShowEditDatePicker(v => !v)}
        onCancel={() => { setShowEditModal(false); setEditingTx(null); setShowEditEventDrop(false); setShowEditDatePicker(false); }}
        onSave={handleSaveEdit}
        extraFooter={
          <TouchableOpacity
            style={styles.deleteInlineBtn}
            onPress={() => { setShowEditModal(false); handleDelete(editingTx); }}
          >
            <Ionicons name="trash-outline" size={16} color={ERROR} />
            <Text style={styles.deleteInlineText}>Delete</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

// ── Shared transaction modal ──────────────────────────────────────────────────
function TxModal({
  visible, title, particular, event, amount, txType, txDate,
  showDrop, showDatePicker, eventOptions = [], dateReadOnly = false,
  currencySymbol = '₹',
  onChangeParticular, onChangeEvent, onChangeAmount, onChangeType,
  onChangeDate, onToggleDrop, onToggleDatePicker,
  onCancel, onSave, extraFooter,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onCancel(); }}>
        <TouchableOpacity style={ms.card} activeOpacity={1}>
          <View style={ms.header}>
            <Text style={ms.headerText}>{title}</Text>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={ms.body}>
              {/* Particular */}
              <Text style={ms.label}>Particular <Text style={ms.optionalHint}>(optional)</Text></Text>
              <TextInput
                style={ms.input}
                value={particular}
                onChangeText={onChangeParticular}
                placeholder="Description (optional)"
                placeholderTextColor="#bbb"
                autoFocus
              />

              {/* Date picker */}
              <Text style={[ms.label, { marginTop: 14 }]}>Date</Text>
              <TouchableOpacity
                style={ms.dropTrigger}
                onPress={dateReadOnly ? undefined : onToggleDatePicker}
                activeOpacity={dateReadOnly ? 1 : 0.7}
              >
                <Text style={ms.dropValueSelected}>
                  {txDate ? toDisplayDate(toISODate(txDate)) : 'Select date'}
                </Text>
                {!dateReadOnly && <Ionicons name="calendar-outline" size={18} color="#888" />}
              </TouchableOpacity>
              {!dateReadOnly && showDatePicker && (
                <DateTimePicker
                  value={toSafeDate(txDate)}
                  mode="date"
                  display="default"
                  onChange={(_, selected) => {
                    if (selected) {
                      onChangeDate(toSafeDate(selected));
                    } else {
                      onToggleDatePicker();
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}

              {/* Event dropdown */}
              <Text style={[ms.label, { marginTop: 14 }]}>Event</Text>
              <TouchableOpacity style={ms.dropTrigger} onPress={onToggleDrop}>
                <Text style={event ? ms.dropValueSelected : ms.dropValuePlaceholder}>
                  {event || 'Select event (optional)'}
                </Text>
                <Ionicons name={showDrop ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
              </TouchableOpacity>
              {showDrop && (
                <View style={ms.dropList}>
                  <TouchableOpacity style={ms.dropItem} onPress={() => { onChangeEvent(''); onToggleDrop(); }}>
                    <Text style={[ms.dropItemText, { color: '#aaa', fontStyle: 'italic' }]}>None</Text>
                  </TouchableOpacity>
                  {eventOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.name}
                      style={[ms.dropItem, event === opt.name && ms.dropItemActive]}
                      onPress={() => {
                        onChangeEvent(opt.name);
                        // Auto-fill amount if this event has a price set
                        if (opt.price != null && opt.price !== '') {
                          onChangeAmount(parseFloat(opt.price).toFixed(2));
                        }
                        onToggleDrop();
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[ms.dropItemText, event === opt.name && ms.dropItemTextActive]}>
                          {opt.name}
                        </Text>
                        {opt.price != null && (
                          <Text style={ms.dropItemPrice}>{currencySymbol}{parseFloat(opt.price).toFixed(2)}</Text>
                        )}
                      </View>
                      {event === opt.name && <Ionicons name="checkmark" size={16} color={PRIMARY} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Amount */}
              <Text style={[ms.label, { marginTop: 14 }]}>Amount</Text>
              <TextInput
                style={ms.input}
                value={amount}
                onChangeText={onChangeAmount}
                placeholder="0.00"
                placeholderTextColor="#bbb"
                keyboardType="decimal-pad"
              />

              {/* Credit / Debit toggle */}
              <View style={ms.toggleRow}>
                <TouchableOpacity
                  style={[ms.toggleBtn, txType === 'credit' && { backgroundColor: PRIMARY, borderColor: PRIMARY }]}
                  onPress={() => onChangeType('credit')}
                >
                  <Text style={[ms.toggleText, txType === 'credit' && { color: '#fff' }]}>Credit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ms.toggleBtn, txType === 'debit' && { backgroundColor: ERROR, borderColor: ERROR }]}
                  onPress={() => onChangeType('debit')}
                >
                  <Text style={[ms.toggleText, txType === 'debit' && { color: '#fff' }]}>Debit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={ms.footer}>
            {extraFooter || <View />}
            <View style={ms.footerBtns}>
              <TouchableOpacity style={ms.cancelBtn} onPress={onCancel}>
                <Text style={ms.cancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ms.saveBtn} onPress={onSave}>
                <Text style={ms.saveText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },

  appBar: { backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', paddingTop: 40, paddingBottom: 12, paddingHorizontal: 4, elevation: 4 },
  appBarBtn: { padding: 10 },
  appBarTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#fff', marginLeft: 4 },
  appBarRight: { flexDirection: 'row' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111', paddingVertical: 4 },

  // Event filter chips
  chipScroll: { backgroundColor: '#fff', maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  chipRow:    { paddingHorizontal: 10, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip:       { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1.5, borderColor: '#DDD', backgroundColor: '#F5F5F5' },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:   { fontSize: 12, color: '#555', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  tableHeader: { flexDirection: 'row', backgroundColor: PRIMARY_DARK },
  tableBody:   { flex: 1 },
  tableRow:    { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  rowEven:     { backgroundColor: '#fff' },
  rowOdd:      { backgroundColor: '#FAFAFA' },
  cell:        { paddingHorizontal: 6, paddingVertical: 9, borderRightWidth: 1, borderRightColor: '#EEEEEE', justifyContent: 'center' },
  dateCell:       { width: 72 },
  particularCell: { flex: 1 },
  amountCell:     { width: 68, alignItems: 'flex-end' },
  headerText: { fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center' },
  cellTeal:   { fontSize: 12, color: TEAL, fontWeight: '600' },
  eventTag:   { fontSize: 10, color: '#9C27B0', marginTop: 2 },
  creditAmt:  { fontSize: 12, color: TEAL,  fontWeight: '700' },
  debitAmt:   { fontSize: 12, color: ERROR, fontWeight: '700' },
  dimAmt:     { fontSize: 12, color: '#bbb' },

  emptyContent:   { flex: 1 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText:      { fontSize: 16, fontWeight: '600', color: '#777', marginTop: 12 },
  emptySubtext:   { fontSize: 13, color: '#aaa', marginTop: 6, textAlign: 'center' },

  summaryBar:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#DDD', elevation: 4 },
  summaryItem:    { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: '#EEEEEE' },
  summaryDivider: { width: 1, backgroundColor: '#DDD' },
  summaryLabel:   { fontSize: 11, color: '#666', fontWeight: '500' },
  summaryValue:   { fontSize: 13, fontWeight: '700', color: '#222', marginTop: 2 },

  deleteInlineBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 4 },
  deleteInlineText: { fontSize: 13, color: ERROR, fontWeight: '600' },

  // Snackbar
  snackbar: {
    position: 'absolute', bottom: 72, left: 12, right: 12,
    backgroundColor: '#323232', borderRadius: 6,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, elevation: 8,
  },
  snackText:  { color: '#fff', fontSize: 14, flex: 1 },
  snackUndo:  { color: '#BB86FC', fontSize: 14, fontWeight: '700', marginLeft: 12 },

  // Three-dot menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  menuCard: {
    position: 'absolute', top: 88, right: 8,
    backgroundColor: '#fff', borderRadius: 6, minWidth: 200, elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, overflow: 'hidden',
  },
  menuRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  menuRowText: { fontSize: 15, color: '#222', fontWeight: '500' },
});

const ms = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card:     { backgroundColor: '#fff', borderRadius: 8, width: '100%', maxWidth: 360, maxHeight: '90%', overflow: 'hidden', elevation: 8 },
  header:   { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 14 },
  headerText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  body:     { padding: 20, paddingBottom: 8 },
  label:    { fontSize: 13, color: '#E57373', marginBottom: 6, fontWeight: '500' },
  optionalHint: { fontSize: 12, color: '#aaa', fontWeight: '400', fontStyle: 'italic' },
  input:    { fontSize: 16, color: '#111', borderBottomWidth: 1.5, borderBottomColor: '#E0E0E0', paddingVertical: 6, marginBottom: 4 },

  dropTrigger:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1.5, borderBottomColor: '#E0E0E0', paddingVertical: 10 },
  dropValueSelected:    { fontSize: 15, color: '#111', flex: 1 },
  dropValuePlaceholder: { fontSize: 15, color: '#bbb', flex: 1 },
  dropList:             { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 6, marginTop: 4, backgroundColor: '#fff', elevation: 4 },
  dropItem:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropItemPrice:        { fontSize: 12, color: '#00ACC1', marginTop: 2, fontWeight: '500' },
  dropItemActive:       { backgroundColor: '#EDE7F6' },
  dropItemText:         { fontSize: 14, color: '#333' },
  dropItemTextActive:   { color: PRIMARY, fontWeight: '600' },

  toggleRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 4, borderWidth: 1.5, borderColor: '#DDD', alignItems: 'center' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#666' },
  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  footerBtns: { flexDirection: 'row', gap: 8 },
  cancelBtn:  { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: PRIMARY },
  cancelText: { color: PRIMARY, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  saveBtn:    { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: PRIMARY },
  saveText:   { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
});

// ── Swipeable styles ──────────────────────────────────────────────────────────
const sw = StyleSheet.create({
  container:    { overflow: 'hidden' },
  deleteAction: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, backgroundColor: ERROR, justifyContent: 'center', alignItems: 'center' },
  deleteBtn:    { alignItems: 'center', justifyContent: 'center', width: 80, flex: 1 },
  deleteTxt:    { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 3 },
});
