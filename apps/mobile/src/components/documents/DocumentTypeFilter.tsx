import React from "react";
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { Colors } from "../../theme";
import { DocType } from "../../services/documentsApi";

const TABS: { label: string; value: DocType | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Invoices", value: "INVOICE" },
  { label: "Estimates", value: "ESTIMATE" },
  { label: "Pro forma", value: "PROFORMA" },
  { label: "Delivery notes", value: "DELIVERY_NOTE" },
  { label: "Purchase orders", value: "PURCHASE_ORDER" },
];

interface Props {
  active: DocType | "ALL";
  onChange: (v: DocType | "ALL") => void;
}

export default function DocumentTypeFilter({ active, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {TABS.map((tab) => {
        const isActive = active === tab.value;
        return (
          <TouchableOpacity
            key={tab.value}
            style={styles.tab}
            onPress={() => onChange(tab.value)}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            {isActive && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, paddingBottom: 4, gap: 4 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  tabText: { color: Colors.textMuted, fontSize: 14 },
  tabTextActive: { color: Colors.primary, fontWeight: "700" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 3 },
});
