import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, fmtCurrency } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { fetchExpenses, fetchCategories, Expense } from "../../services/expensesApi";
import { MoreStackParamList } from "../../navigation/MoreStack";

type Nav = NativeStackNavigationProp<MoreStackParamList>;

export default function ExpensesScreen() {
  const nav = useNavigation<Nav>();
  const { business } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (cat?: string) => {
    if (!business) return;
    try {
      const [data, cats] = await Promise.all([
        fetchExpenses(business.id, cat === "All" ? undefined : cat),
        categories.length === 0 ? fetchCategories() : Promise.resolve(categories),
      ]);
      setExpenses(data);
      if (categories.length === 0) setCategories(cats);
    } finally { setLoading(false); setRefreshing(false); }
  }, [business, categories]);

  useEffect(() => { load(activeCategory); }, [activeCategory]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}><Ionicons name="arrow-back" size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Expenses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => nav.navigate("CreateExpense", {})}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.totalChip}>
        <Text style={styles.totalLabel}>{activeCategory === "All" ? "Total" : activeCategory}</Text>
        <Text style={styles.totalValue}>{fmtCurrency(total)}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {["All", ...categories].map((cat) => (
          <TouchableOpacity key={cat} style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]} onPress={() => setActiveCategory(cat)}>
            <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        : expenses.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No expenses found</Text>
            <Text style={styles.emptyText}>Track your business expenses here</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => nav.navigate("CreateExpense", {})}><Text style={styles.emptyBtnText}>Add Expense</Text></TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={(e) => e.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(activeCategory); }} tintColor={Colors.primary} />}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: 68 }} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => nav.navigate("CreateExpense", { id: item.id })} activeOpacity={0.7}>
                <View style={[styles.catDot, { backgroundColor: item.paid ? Colors.successMuted : Colors.dangerMuted }]}>
                  <Ionicons name={item.paid ? "checkmark" : "time-outline"} size={14} color={item.paid ? Colors.success : Colors.danger} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.expenseTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.expenseMeta}>{item.category}  ·  {new Date(item.date).toLocaleDateString("en-NG")}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.amount}>{fmtCurrency(item.amount)}</Text>
                  {!item.paid && <Text style={styles.unpaidLabel}>Unpaid</Text>}
                </View>
              </TouchableOpacity>
            )}
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, gap: 12 },
  title: { ...Typography.heading, fontSize: 22, flex: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceHigh, alignItems: "center", justifyContent: "center" },
  totalChip: { flexDirection: "row", justifyContent: "space-between", backgroundColor: Colors.surface, marginHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  totalLabel: { color: Colors.textMuted, fontSize: 14 },
  totalValue: { color: Colors.text, fontSize: 16, fontWeight: "700" },
  filterRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { color: Colors.textMuted, fontSize: 13 },
  filterChipTextActive: { color: "#000", fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
  catDot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowInfo: { flex: 1 },
  expenseTitle: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  expenseMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: "flex-end" },
  amount: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  unpaidLabel: { color: Colors.danger, fontSize: 11, marginTop: 2 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { ...Typography.heading, fontSize: 20, textAlign: "center" },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyBtnText: { color: "#000", fontWeight: "700", fontSize: 15 },
});
