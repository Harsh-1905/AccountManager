import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Modal, TextInput, Alert, Keyboard, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllEvents, createEvent, deleteEvent, getSetting } from '../database/queries';

const PRIMARY      = '#6200EE';
const PRIMARY_DARK = '#4A148C';
const ERROR        = '#C62828';
const TEAL         = '#00ACC1';

export default function ManageEventsScreen({ navigation }) {
  const [events, setEvents]           = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [eventName, setEventName]     = useState('');
  const [eventPrice, setEventPrice]   = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  const loadEvents = useCallback(() => {
    setEvents(getAllEvents());
    const sym = getSetting('currency_symbol');
    if (sym) setCurrencySymbol(sym);
  }, []);

  useFocusEffect(useCallback(() => {
    loadEvents();
  }, [loadEvents]));

  const openAddModal = () => {
    setEventName('');
    setEventPrice('');
    setShowAddModal(true);
  };

  const handleAdd = () => {
    const name = eventName.trim();
    if (!name) {
      Alert.alert('Error', 'Please enter an event name.');
      return;
    }
    const price = eventPrice.trim();
    if (price !== '' && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      Alert.alert('Error', 'Please enter a valid price (or leave it blank).');
      return;
    }
    try {
      createEvent(name, price === '' ? null : price);
      setEventName('');
      setEventPrice('');
      setShowAddModal(false);
      loadEvents();
    } catch (e) {
      Alert.alert('Error', e.message.includes('UNIQUE') ? 'An event with that name already exists.' : e.message);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Event',
      `Delete "${item.name}"? This will not affect existing transactions that already use this event.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { deleteEvent(item.id); loadEvents(); },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Ionicons name="pricetag-outline" size={18} color={PRIMARY} style={styles.rowIcon} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowText}>{item.name}</Text>
        {item.price != null
          ? <Text style={styles.rowPrice}>{currencySymbol}{parseFloat(item.price).toFixed(2)}</Text>
          : <Text style={styles.rowPriceDim}>No price set</Text>
        }
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
        <Ionicons name="trash-outline" size={20} color={ERROR} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />

      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.appBarBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Manage Events</Text>
      </View>

      {/* List */}
      <FlatList
        data={events}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, events.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Events</Text>
            <Text style={styles.emptySubtitle}>Tap the + button to add your first event.</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Event Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => { Keyboard.dismiss(); setShowAddModal(false); }}
        >
          <TouchableOpacity style={styles.dialog} activeOpacity={1}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Add new event</Text>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              <View style={styles.dialogBody}>
                {/* Event name */}
                <Text style={styles.inputLabel}>Event name</Text>
                <TextInput
                  style={styles.input}
                  value={eventName}
                  onChangeText={setEventName}
                  placeholder="e.g. Wedding Shoot"
                  placeholderTextColor="#bbb"
                  autoFocus
                  returnKeyType="next"
                />

                {/* Price */}
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                  Price ({currencySymbol}) <Text style={styles.optionalHint}>optional</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={eventPrice}
                  onChangeText={setEventPrice}
                  placeholder="e.g. 5000.00"
                  placeholderTextColor="#bbb"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
                <Text style={styles.hint}>
                  When you pick this event while adding a transaction, the amount will be filled in automatically.
                </Text>
              </View>
            </ScrollView>
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
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

  list: { padding: 12 },
  listEmpty: { flex: 1, justifyContent: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    elevation: 1,
  },
  rowIcon: { marginRight: 12 },
  rowInfo: { flex: 1 },
  rowText:     { fontSize: 15, color: '#222', fontWeight: '500' },
  rowPrice:    { fontSize: 13, color: TEAL, fontWeight: '600', marginTop: 2 },
  rowPriceDim: { fontSize: 12, color: '#bbb', marginTop: 2, fontStyle: 'italic' },
  deleteBtn: { padding: 4 },
  separator: { height: 8 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 14 },
  emptySubtitle: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FF5722',
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  dialog: {
    backgroundColor: '#fff', borderRadius: 8,
    width: '100%', maxWidth: 360, overflow: 'hidden', elevation: 8,
  },
  dialogHeader: { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 14 },
  dialogTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  dialogBody: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  inputLabel: { fontSize: 13, color: '#E57373', marginBottom: 6, fontWeight: '500' },
  optionalHint: { fontSize: 12, color: '#aaa', fontWeight: '400', fontStyle: 'italic' },
  input: {
    fontSize: 16, color: '#111',
    borderBottomWidth: 1.5, borderBottomColor: '#E57373',
    paddingVertical: 6, marginBottom: 4,
  },
  hint: {
    fontSize: 12, color: '#aaa', marginTop: 6, marginBottom: 8,
    lineHeight: 17,
  },
  dialogButtons: {
    flexDirection: 'row', justifyContent: 'flex-end',
    padding: 12, gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: PRIMARY,
  },
  cancelText: { color: PRIMARY, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  saveBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, backgroundColor: PRIMARY,
  },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
});
