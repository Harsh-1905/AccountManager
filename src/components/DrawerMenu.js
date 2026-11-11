import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(300, SCREEN_WIDTH * 0.82);

const MENU_ITEMS = [
  { icon: 'home-outline',          label: 'Home',                     key: 'home' },
  { icon: 'cloud-upload-outline',  label: 'Backup',                   key: 'backup' },
  { icon: 'cloud-download-outline',label: 'Restore',                  key: 'restore' },
  { icon: 'bar-chart-outline',     label: 'Reports',                  key: 'reports' },
  { icon: 'cash-outline',          label: 'Change currency',          key: 'currency' },
  { icon: 'lock-closed-outline',   label: 'Change password',          key: 'password' },
  { icon: 'help-circle-outline',   label: 'Change security question', key: 'security' },
  { icon: 'pricetags-outline',      label: 'Manage Events',            key: 'manageEvents' },
  { icon: 'settings-outline',      label: 'Settings',                 key: 'settings' },
];

export default function DrawerMenu({ visible, onClose, onNavigate, onBackup, onRestore, summary, currencySymbol }) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0,             duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1,             duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,             duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const fmt = (val) => (parseFloat(val) || 0).toFixed(2);

  const handleItem = (key) => {
    onClose();
    if (key === 'backup')  { onBackup?.();  return; }
    if (key === 'restore') { onRestore?.(); return; }
    onNavigate(key);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Full-screen backdrop — tapping anywhere outside the drawer closes it */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        activeOpacity={1}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableOpacity>

      {/* Drawer panel — sits on top, swallows its own touches */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="book" size={36} color="#6200EE" />
          </View>
          <Text style={styles.appTitle}>Account Manager</Text>
          <View style={styles.divider} />
          {/* Summary */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Credit(+)</Text>
              <Text style={styles.summaryValue}>{currencySymbol}{fmt(summary.credit)}</Text>
            </View>
            <View style={styles.summaryColDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Debit(-)</Text>
              <Text style={styles.summaryValue}>{currencySymbol}{fmt(summary.debit)}</Text>
            </View>
            <View style={styles.summaryColDivider} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { fontWeight: '700' }]}>Balance</Text>
              <Text style={[styles.summaryValue, { fontWeight: '800' }]}>
                {currencySymbol}{fmt(summary.balance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu */}
        <ScrollView style={styles.menu} showsVerticalScrollIndicator={false} bounces={false}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuItem}
              onPress={() => handleItem(item.key)}
              activeOpacity={0.65}
            >
              <Ionicons name={item.icon} size={21} color="#555" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 4, height: 0 },
    shadowRadius: 8,
  },
  header: {
    backgroundColor: '#6200EE',
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
    elevation: 3,
  },
  appTitle: {
    fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 10,
  },
  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 10,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryColDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  summaryValue: { fontSize: 13, color: '#fff', fontWeight: '600' },
  menu: { flex: 1 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  menuIcon: { marginRight: 16, width: 22, textAlign: 'center' },
  menuLabel: { fontSize: 14, color: '#222', fontWeight: '500' },
});
