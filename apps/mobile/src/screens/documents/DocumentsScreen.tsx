import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, fmtCurrency } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { fetchDocuments, Document, DocType } from "../../services/documentsApi";
import { StatusBadge } from "../../components/documents/StatusBadge";
import DocumentTypeFilter from "../../components/documents/DocumentTypeFilter";
import { RootStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EMPTY_MESSAGES: Record<string, { title: string; msg: string }> = {
  ALL: { title: "No documents yet", msg: "Create your first invoice to get started" },
  INVOICE: { title: "No invoices yet", msg: "Create an invoice to start getting paid" },
  ESTIMATE: { title: "No estimates yet", msg: "Win more work by sending estimates" },
  PROFORMA: { title: "No pro formas", msg: "Send a pro forma before the final invoice" },
  DELIVERY_NOTE: { title: "No delivery notes", msg: "Record delivered goods here" },
  PURCHASE_ORDER: { title: "No purchase orders", msg: "Track your supplier orders here" },
};

export default function DocumentsScreen() {
  const nav = useNavigation<Nav>();
  const { business } = useAuthStore();
  const [docs, setDocs] = useState<Document[]>([]);
  const [filter, setFilter] = useState<DocType | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!business) return;
    try {
      const data = await fetchDocuments(business.id, filter === "ALL" ? undefined : filter);
      setDocs(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [business, filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = query
    ? docs.filter((d) =>
        d.document_number.toLowerCase().includes(query.toLowerCase()) ||
        d.client?.name?.toLowerCase().includes(query.toLowerCase())
      )
    : docs;

  const empty = EMPTY_MESSAGES[filter] ?? EMPTY_MESSAGES.ALL;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => nav.navigate("CreateDocument", {})}
        >
          <Ionicons name="add" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <DocumentTypeFilter active={filter} onChange={setFilter} />

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>{empty.title}</Text>
          <Text style={styles.emptyMsg}>{empty.msg}</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => nav.navigate("CreateDocument", {})}>
            <Text style={styles.emptyBtnText}>Create Document</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border }} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => nav.navigate("DocumentDetail", { id: item.id })}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.docNumber}>{item.document_number}</Text>
                <Text style={styles.clientName} numberOfLines={1}>
                  {item.client?.name ?? "No client"}
                </Text>
                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleDateString("en-NG")}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.amount}>{fmtCurrency(item.total)}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  title: { ...Typography.heading, fontSize: 28 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceHigh, alignItems: "center", justifyContent: "center" },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface, marginHorizontal: 20, marginBottom: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15, padding: 0 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
  rowLeft: { flex: 1 },
  docNumber: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  clientName: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  date: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 6, marginRight: 4 },
  amount: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { ...Typography.heading, fontSize: 20, textAlign: "center" },
  emptyMsg: { color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyBtnText: { color: "#000", fontWeight: "700", fontSize: 15 },
});
