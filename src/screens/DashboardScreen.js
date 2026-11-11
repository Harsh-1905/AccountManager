import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Modal, TextInput, Alert, Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  getAllAccountsWithSummary, createAccount, updateAccount,
  deleteAccount, getSetting, setSetting, getOverallSummary, getTransactionsByAccount,
  exportAllData, importData,
} from '../database/queries';
import DrawerMenu from '../components/DrawerMenu';

const PRIMARY = '#6200EE';
const PRIMARY_DARK = '#4A148C';
const ACCENT = '#FF5722';

export default function DashboardScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [overallSummary, setOverallSummary] = useState({ credit: 0, debit: 0, balance: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState(null); // null = no grade picked yet
  const [customMode, setCustomMode] = useState(false);      // true = show text input

  const GRADES = ['A+', 'A', 'B', 'C'];

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editName, setEditName] = useState('');

  // Search
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');

  // Ellipsis menu
  const [showMenu, setShowMenu] = useState(false);

  const loadData = useCallback(() => {
    const accs = getAllAccountsWithSummary();
    const sort = getSetting('account_sort') || 'recent';

    // Apply account sort order from settings
    const sorted = [...accs].sort((a, b) => {
      if (sort === 'name')    return a.name.localeCompare(b.name);
      if (sort === 'balance') return (b.balance || 0) - (a.balance || 0);
      return 0; // 'recent' = DB order (created_at ASC already from query)
    });

    setAccounts(sorted);
    const sym = getSetting('currency_symbol');
    if (sym) setCurrencySymbol(sym);
    const s = getOverallSummary();
    setOverallSummary(s);
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
    checkBackupReminder();
  }, [loadData]));

  const checkBackupReminder = () => {
    const reminder = getSetting('backup_reminder') || 'off';
    if (reminder === 'off') return;

    const lastBackup = getSetting('last_backup_date') || '';
    const now = new Date();
    const last = lastBackup ? new Date(lastBackup) : null;

    let isDue = false;
    if (!last) {
      isDue = true; // never backed up
    } else {
      const diffMs   = now - last;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (reminder === 'daily'   && diffDays >= 1)  isDue = true;
      if (reminder === 'weekly'  && diffDays >= 7)  isDue = true;
      if (reminder === 'monthly' && diffDays >= 30) isDue = true;
    }

    if (isDue) {
      Alert.alert(
        '📦 Backup Reminder',
        'It\'s time to back up your data. Go to the menu and tap "Backup" to save your data.',
        [{ text: 'OK' }]
      );
    }
  };

  const filteredAccounts = searchQuery.trim()
    ? accounts.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : accounts;

  const handleAddAccount = () => {
    const name = customMode ? accountName.trim() : selectedGrade;
    if (!name) {
      Alert.alert('Error', customMode ? 'Please enter an account name.' : 'Please select a grade or choose custom.');
      return;
    }
    createAccount(name);
    setAccountName(''); setSelectedGrade(null); setCustomMode(false);
    setShowAddModal(false);
    loadData();
  };

  const openAddModal = () => {
    setAccountName(''); setSelectedGrade(null); setCustomMode(false);
    setShowAddModal(true);
  };

  const handleEditAccount = () => {
    const trimmed = editName.trim();
    if (!trimmed) { Alert.alert('Error', 'Please enter an account name.'); return; }
    updateAccount(editingAccount.id, trimmed);
    setShowEditModal(false);
    setEditingAccount(null);
    loadData();
  };

  const handleDeleteAccount = (account) => {
    Alert.alert('Delete Account', `Delete "${account.name}"? All transactions will be removed too.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteAccount(account.id); loadData(); } },
    ]);
  };

  const handleDrawerNavigate = (key) => {
    switch (key) {
      case 'home':     navigation.navigate('Dashboard');              break;
      case 'reports':  navigation.navigate('Reports');                break;
      case 'currency': navigation.navigate('Currency');               break;
      case 'password': navigation.navigate('ChangePassword');         break;
      case 'security': navigation.navigate('ChangeSecurityQuestion'); break;
      case 'settings': navigation.navigate('Settings');               break;
      case 'manageEvents': navigation.navigate('ManageEvents');       break;
      default: break;
    }
  };

  const fmt = (val) => (parseFloat(val) || 0).toFixed(2);

  // ── Backup ──
  const handleBackup = async () => {
    try {
      const data = exportAllData();
      const json = JSON.stringify(data, null, 2);
      const fileName = `accountmanager_backup_${new Date().toISOString().slice(0, 10)}.json`;
      const dest = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(dest, json, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, {
          mimeType: 'application/json',
          dialogTitle: 'Save Backup',
        });
        // Record the backup date so reminder resets
        setSetting('last_backup_date', new Date().toISOString());
      } else {
        Alert.alert('Backup Saved', `File saved to:\n${dest}`);
        setSetting('last_backup_date', new Date().toISOString());
      }
    } catch (e) {
      Alert.alert('Backup Failed', e.message);
    }
  };

  // ── Restore ──
  const handleRestore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const response = await fetch(file.uri);
      const content = await response.text();
      let data;
      try {
        data = JSON.parse(content);
      } catch {
        Alert.alert('Invalid File', 'The selected file is not a valid backup.');
        return;
      }

      if (!data.version || !Array.isArray(data.accounts)) {
        Alert.alert('Invalid File', 'This does not appear to be an Account Manager backup file.');
        return;
      }

      const accountCount = data.accounts?.length ?? 0;
      const txCount = data.transactions?.length ?? 0;

      Alert.alert(
        'Restore Backup',
        `Found ${accountCount} account(s) and ${txCount} transaction(s).\n\nExisting data will NOT be overwritten. Only new records will be added.\n\nContinue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            onPress: () => {
              try {
                const { accountsImported, transactionsImported } = importData(data);
                loadData();
                Alert.alert(
                  'Restore Complete',
                  `Imported ${accountsImported} new account(s) and ${transactionsImported} new transaction(s).`
                );
              } catch (err) {
                Alert.alert('Restore Failed', err.message);
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Restore Failed', e.message);
    }
  };

  // ── Export all accounts as Excel (CSV) ──
  const exportAllAsExcel = async () => {
    setShowMenu(false);
    try {
      const sym = currencySymbol;
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      let csv = '\uFEFF'; // BOM for Excel UTF-8

      for (const acc of accounts) {
        // Account header
        csv += `${esc(acc.name)}\n`;
        csv += `Date,Particular,Event,Credit(${sym}),Debit(${sym})\n`;

        // Transactions for this account
        const txs = getTransactionsByAccount(acc.id);
        if (txs.length === 0) {
          csv += `,,,,\n`;
        } else {
          for (const tx of txs) {
            csv += [
              esc(tx.date),
              esc(tx.particular),
              esc(tx.event || ''),
              tx.type === 'credit' ? fmt(tx.amount) : '0',
              tx.type === 'debit'  ? fmt(tx.amount) : '0',
            ].join(',') + '\n';
          }
        }

        // Account summary row
        csv += `,,Total,${fmt(acc.total_credit)},${fmt(acc.total_debit)}\n`;
        csv += `,,Balance,${fmt(acc.balance)},\n`;
        csv += '\n'; // blank row between accounts
      }

      // Overall summary at the bottom
      csv += `OVERALL SUMMARY\n`;
      csv += `Total Credit,${fmt(overallSummary.credit)}\n`;
      csv += `Total Debit,${fmt(overallSummary.debit)}\n`;
      csv += `Net Balance,${fmt(overallSummary.balance)}\n`;

      const fileName = `all_accounts_${new Date().toISOString().slice(0, 10)}.csv`;
      const dest = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(dest, csv, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, {
          mimeType: 'text/csv',
          UTI: 'public.comma-separated-values-text',
          dialogTitle: 'Export All Accounts',
        });
      } else {
        Alert.alert('Saved', `File saved to:\n${dest}`);
      }
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    }
  };

  const renderAccount = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{item.name}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => { setEditingAccount(item); setEditName(item.name); setShowEditModal(true); }}
          >
            <Ionicons name="pencil" size={17} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteAccount(item)}>
            <Ionicons name="trash-outline" size={17} color="#C62828" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.summaryRow}>
        <TouchableOpacity
          style={styles.summaryBox}
          onPress={() => navigation.navigate('AccountDetail', { accountId: item.id })}
        >
          <Text style={styles.boxLabel}>Credit(↑)</Text>
          <Text style={styles.boxAmount}>{currencySymbol} {fmt(item.total_credit)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.summaryBox}
          onPress={() => navigation.navigate('AccountDetail', { accountId: item.id })}
        >
          <Text style={styles.boxLabel}>Debit(↓)</Text>
          <Text style={styles.boxAmount}>{currencySymbol} {fmt(item.total_debit)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.summaryBox, styles.balanceBox]}
          onPress={() => navigation.navigate('AccountDetail', { accountId: item.id })}
        >
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceAmount}>{currencySymbol} {fmt(item.balance)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />

      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.appBarBtn} onPress={() => setDrawerOpen(true)}>
          <Ionicons name="menu" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Dashboard</Text>
        <View style={styles.appBarRight}>
          <TouchableOpacity
            style={styles.appBarBtn}
            onPress={() => { setSearchVisible(v => !v); setSearchQuery(''); }}
          >
            <Ionicons name={searchVisible ? 'close' : 'search'} size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.appBarBtn}
            onPress={() => setShowMenu(true)}
          >
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
            placeholder="Search accounts by name..."
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

      {/* Accounts list */}
      <FlatList
        data={filteredAccounts}
        keyExtractor={item => item.id.toString()}
        renderItem={renderAccount}
        contentContainerStyle={[styles.list, filteredAccounts.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {searchQuery ? (
              <>
                <Ionicons name="search-outline" size={70} color="#ccc" />
                <Text style={styles.emptyTitle}>NO RESULTS</Text>
                <Text style={styles.emptySubtitle}>No account matches "{searchQuery}"</Text>
              </>
            ) : (
              <>
                <Ionicons name="warning" size={70} color="#E57373" />
                <Text style={styles.emptyTitle}>NO ACCOUNT ADDED</Text>
                <Text style={styles.emptySubtitle}>Click on add button to add your account.</Text>
              </>
            )}
          </View>
        }
      />

      {/* Orange FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Custom Drawer */}
      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={handleDrawerNavigate}
        onBackup={handleBackup}
        onRestore={handleRestore}
        summary={overallSummary}
        currencySymbol={currencySymbol}
      />

      {/* Ellipsis menu */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuRow} onPress={exportAllAsExcel}>
              <Ionicons name="grid-outline" size={20} color="#388E3C" style={{ marginRight: 12 }} />
              <Text style={styles.menuRowText}>Save all as Excel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Account Modal */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowAddModal(false); }}>
          <TouchableOpacity style={styles.dialog} activeOpacity={1}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Add new account</Text>
            </View>
            <View style={styles.dialogBody}>
              {/* Grade chips */}
              <Text style={styles.inputLabel}>Select grade</Text>
              <View style={styles.gradeRow}>
                {GRADES.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.gradeChip,
                      selectedGrade === g && !customMode && styles.gradeChipActive,
                    ]}
                    onPress={() => { setSelectedGrade(g); setCustomMode(false); setAccountName(''); }}
                  >
                    <Text style={[
                      styles.gradeChipText,
                      selectedGrade === g && !customMode && styles.gradeChipTextActive,
                    ]}>{g}</Text>
                  </TouchableOpacity>
                ))}
                {/* Custom option */}
                <TouchableOpacity
                  style={[styles.gradeChip, styles.gradeChipCustom, customMode && styles.gradeChipActive]}
                  onPress={() => { setCustomMode(true); setSelectedGrade(null); }}
                >
                  <Text style={[styles.gradeChipText, customMode && styles.gradeChipTextActive]}>Custom</Text>
                </TouchableOpacity>
              </View>

              {/* Custom name input — only shown when Custom is selected */}
              {customMode && (
                <>
                  <Text style={[styles.inputLabel, { marginTop: 14 }]}>Account name</Text>
                  <TextInput
                    style={styles.input}
                    value={accountName}
                    onChangeText={setAccountName}
                    placeholder="Enter account name"
                    placeholderTextColor="#aaa"
                    autoFocus
                    onSubmitEditing={handleAddAccount}
                  />
                </>
              )}
            </View>
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddAccount}>
                <Text style={styles.saveText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Account Modal */}
      <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowEditModal(false); }}>
          <TouchableOpacity style={styles.dialog} activeOpacity={1}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Edit account</Text>
            </View>
            <View style={styles.dialogBody}>
              <Text style={styles.inputLabel}>Account name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Account name"
                placeholderTextColor="#aaa"
                autoFocus
                onSubmitEditing={handleEditAccount}
              />
            </View>
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleEditAccount}>
                <Text style={styles.saveText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },

  appBar: {
    backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 40, paddingBottom: 10, paddingHorizontal: 4,
    elevation: 4,
  },
  appBarBtn: { padding: 10 },
  appBarTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#fff', marginLeft: 4 },
  appBarRight: { flexDirection: 'row' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1, fontSize: 14, color: '#111', paddingVertical: 4,
  },

  list: { padding: 12, paddingBottom: 90 },
  listEmpty: { flex: 1, justifyContent: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 8, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  cardName: { fontSize: 18, fontWeight: '700', color: '#111', flex: 1 },
  cardActions: { flexDirection: 'row', gap: 2 },
  iconBtn: { padding: 6 },

  summaryRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  summaryBox: { flex: 1, backgroundColor: '#F5F5F5', alignItems: 'center', paddingVertical: 10, borderRightWidth: 1, borderRightColor: '#EEEEEE' },
  boxLabel: { fontSize: 11, color: '#666', marginBottom: 4 },
  boxAmount: { fontSize: 14, fontWeight: '600', color: '#222' },
  balanceBox: { flex: 1, backgroundColor: PRIMARY, borderRightWidth: 0, alignItems: 'center', paddingVertical: 10 },
  balanceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  balanceAmount: { fontSize: 14, fontWeight: '700', color: '#fff' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginTop: 14, letterSpacing: 0.5 },
  emptySubtitle: { fontSize: 14, color: '#777', marginTop: 8, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 5,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { backgroundColor: '#fff', borderRadius: 8, width: '100%', maxWidth: 360, overflow: 'hidden', elevation: 8 },
  dialogHeader: { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 14 },
  dialogTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  dialogBody: { padding: 20, paddingBottom: 8 },
  inputLabel: { fontSize: 13, color: '#E57373', marginBottom: 6, fontWeight: '500' },
  input: { fontSize: 16, color: '#111', borderBottomWidth: 1.5, borderBottomColor: '#E57373', paddingVertical: 6, marginBottom: 8 },

  gradeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  gradeChip: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#DDD',
    backgroundColor: '#F5F5F5',
  },
  gradeChipCustom: { borderStyle: 'dashed' },
  gradeChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  gradeChipText: { fontSize: 14, fontWeight: '700', color: '#555' },
  gradeChipTextActive: { color: '#fff' },
  dialogButtons: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, gap: 8 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: PRIMARY },
  cancelText: { color: PRIMARY, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: PRIMARY },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  // Ellipsis menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  menuCard: {
    position: 'absolute', top: 88, right: 8,
    backgroundColor: '#fff', borderRadius: 6, minWidth: 190,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, overflow: 'hidden',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  menuRowText: { fontSize: 15, color: '#222', fontWeight: '500' },
});
