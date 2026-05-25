import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, fmtCurrency, trialDaysLeft } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { RootStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { business } = useAuthStore();
  const daysLeft = trialDaysLeft();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="settings-outline" size={22} color={Colors.textMuted} />
        <Text style={styles.bizName} numberOfLines={1}>{business?.name ?? "Billables"}</Text>
        <Text style={styles.helpLink}>Help</Text>
      </View>

      {/* Trial banner */}
      {daysLeft <= 30 && (
        <View style={[styles.trialBanner, daysLeft <= 0 && styles.trialBannerExpired]}>
          <Ionicons
            name={daysLeft <= 0 ? "alert-circle-outline" : "time-outline"}
            size={16}
            color={daysLeft <= 0 ? Colors.danger : Colors.warning}
          />
          <Text style={[styles.trialText, daysLeft <= 0 && { color: Colors.danger }]}>
            {daysLeft <= 0
              ? "Trial expired. Upgrade to continue."
              : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in trial`}
          </Text>
          <TouchableOpacity>
            <Text style={styles.upgradeLink}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.quickActions}>
        {[
          { label: "New Invoice", icon: "document-text-outline", type: "INVOICE" },
          { label: "New Client", icon: "person-add-outline", screen: "CreateClient" },
          { label: "New Expense", icon: "receipt-outline", screen: "CreateExpense" },
        ].map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.quickBtn}
            onPress={() => {
              if (action.type) nav.navigate("CreateDocument", { type: action.type });
              else nav.navigate(action.screen as any, {});
            }}
          >
            <Ionicons name={action.icon as any} size={20} color={Colors.primary} />
            <Text style={styles.quickBtnText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Metrics */}
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.metricsRow}>
        {[
          { label: "Overdue", value: fmtCurrency(0), color: Colors.danger },
          { label: "Unpaid", value: fmtCurrency(0), color: Colors.warning },
          { label: "Paid", value: fmtCurrency(0), color: Colors.success },
        ].map((m) => (
          <View key={m.label} style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent docs placeholder */}
      <Text style={styles.sectionTitle}>Recent Documents</Text>
      <View style={styles.emptyCard}>
        <Ionicons name="document-outline" size={32} color={Colors.textMuted} />
        <Text style={styles.emptyText}>No documents yet</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  bizName: { ...Typography.heading, fontSize: 17, flex: 1, textAlign: "center", marginHorizontal: 12 },
  helpLink: { color: Colors.primary, fontSize: 14 },
  trialBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.warningMuted,
    marginHorizontal: 20, borderRadius: 10, padding: 12, marginBottom: 16,
  },
  trialBannerExpired: { backgroundColor: Colors.dangerMuted },
  trialText: { flex: 1, color: Colors.warning, fontSize: 13 },
  upgradeLink: { color: Colors.primary, fontSize: 13, fontWeight: "700" },
  quickActions: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  quickBtn: {
    flex: 1, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    padding: 14, alignItems: "center", gap: 6,
  },
  quickBtnText: { color: Colors.text, fontSize: 12, fontWeight: "600", textAlign: "center" },
  sectionTitle: {
    color: Colors.textMuted, fontSize: 12, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.8,
    paddingHorizontal: 20, marginBottom: 12,
  },
  metricsRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  metricCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    padding: 12, alignItems: "center",
  },
  metricValue: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  metricLabel: { color: Colors.textMuted, fontSize: 11 },
  emptyCard: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: 20, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    padding: 32, gap: 8,
  },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
