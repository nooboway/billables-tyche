import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../theme";
import { DocStatus } from "../../services/documentsApi";

const CFG: Record<DocStatus, { bg: string; text: string; label: string }> = {
  DRAFT:     { bg: Colors.surfaceHigh, text: Colors.textMuted, label: "Draft" },
  SENT:      { bg: Colors.primaryMuted, text: Colors.primary, label: "Sent" },
  PAID:      { bg: Colors.successMuted, text: Colors.success, label: "Paid" },
  OVERDUE:   { bg: Colors.dangerMuted, text: Colors.danger, label: "Overdue" },
  CANCELLED: { bg: Colors.surfaceHigh, text: Colors.textMuted, label: "Cancelled" },
};

export function StatusBadge({ status }: { status: DocStatus }) {
  const { bg, text, label } = CFG[status] ?? CFG.DRAFT;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { fontSize: 11, fontWeight: "700" },
});
