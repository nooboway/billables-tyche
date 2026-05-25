import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { MoreStackParamList } from "../../navigation/MoreStack";

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const GRID_ITEMS = [
  { icon: "bar-chart-outline", label: "Reports" },
  { icon: "cube-outline", label: "Products", screen: "Products" },
  { icon: "receipt-outline", label: "Expenses", screen: "Expenses" },
  { icon: "chatbubble-outline", label: "Quote Request" },
  { icon: "storefront-outline", label: "Online Store" },
];

const SETTINGS_ROWS = [
  { section: "Settings", items: [
    { icon: "business-outline", label: "Business Details" },
    { icon: "card-outline", label: "Payment Options" },
    { icon: "calculator-outline", label: "VAT Settings" },
    { icon: "color-palette-outline", label: "Template Design" },
  ]},
  { section: "Account", items: [
    { icon: "star-outline", label: "Subscription" },
    { icon: "people-outline", label: "My Team" },
    { icon: "language-outline", label: "Language" },
    { icon: "lock-closed-outline", label: "Security" },
  ]},
];

export default function MoreScreen() {
  const nav = useNavigation<Nav>();
  const { logout } = useAuthStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.title}>More</Text>

      {/* Grid */}
      <View style={styles.grid}>
        {GRID_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.gridItem}
            onPress={() => item.screen && nav.navigate(item.screen as any)}
          >
            <View style={styles.gridIcon}>
              <Ionicons name={item.icon as any} size={24} color={Colors.primary} />
            </View>
            <Text style={styles.gridLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Settings rows */}
      {SETTINGS_ROWS.map((group) => (
        <View key={group.section} style={styles.settingsGroup}>
          <Text style={styles.groupLabel}>{group.section}</Text>
          {group.items.map((item, i) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity style={styles.settingsRow}>
                <Ionicons name={item.icon as any} size={18} color={Colors.textMuted} style={{ marginRight: 12 }} />
                <Text style={styles.settingsLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              {i < group.items.length - 1 && <View style={styles.separator} />}
            </React.Fragment>
          ))}
        </View>
      ))}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  title: { ...Typography.heading, fontSize: 28, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  gridItem: {
    width: "30%", backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    padding: 16, alignItems: "center", gap: 8,
  },
  gridIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: Colors.primaryMuted, alignItems: "center", justifyContent: "center",
  },
  gridLabel: { color: Colors.text, fontSize: 12, fontWeight: "600", textAlign: "center" },
  settingsGroup: {
    backgroundColor: Colors.surface, marginHorizontal: 20,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 16, overflow: "hidden",
  },
  groupLabel: {
    color: Colors.textMuted, fontSize: 11, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  settingsRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingsLabel: { flex: 1, color: Colors.text, fontSize: 15 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 46 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: 20, marginTop: 8, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.dangerMuted, borderRadius: 10,
  },
  logoutText: { color: Colors.danger, fontSize: 15, fontWeight: "600" },
});
