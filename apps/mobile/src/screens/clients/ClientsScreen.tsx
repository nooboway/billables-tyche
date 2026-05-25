import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, SectionList, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { fetchClients, Client } from "../../services/clientsApi";
import { ClientsStackParamList } from "../../navigation/ClientsStack";

type Nav = NativeStackNavigationProp<ClientsStackParamList>;
interface Section { title: string; data: Client[] }

function groupAlpha(clients: Client[]): Section[] {
  const map = new Map<string, Client[]>();
  for (const c of clients) {
    const key = /[A-Z]/.test(c.name.charAt(0).toUpperCase()) ? c.name.charAt(0).toUpperCase() : "#";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
    .map(([title, data]) => ({ title, data }));
}

export default function ClientsScreen() {
  const nav = useNavigation<Nav>();
  const { business } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (q?: string) => {
    if (!business) return;
    try { const data = await fetchClients(business.id, q); setClients(data); }
    finally { setLoading(false); setRefreshing(false); }
  }, [business]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => load(query), 300); return () => clearTimeout(t); }, [query, load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => nav.navigate("CreateClient", {})}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput style={styles.searchInput} placeholder="Search clients..." placeholderTextColor={Colors.textMuted} value={query} onChangeText={setQuery} />
      </View>

      {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        : clients.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No clients yet</Text>
            <Text style={styles.emptyText}>Add your first client to start sending invoices</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => nav.navigate("CreateClient", {})}>
              <Text style={styles.emptyBtnText}>Add Client</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SectionList
            sections={groupAlpha(clients)}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(query); }} tintColor={Colors.primary} />}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}><Text style={styles.sectionLetter}>{section.title}</Text></View>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => nav.navigate("ClientDetail", { id: item.id })} activeOpacity={0.7}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text></View>
                <View style={styles.rowInfo}>
                  <Text style={styles.clientName}>{item.name}</Text>
                  {item.email && <Text style={styles.clientEmail} numberOfLines={1}>{item.email}</Text>}
                </View>
                <View style={styles.rowRight}>
                  {(item._count?.documents ?? 0) > 0 && <Text style={styles.docCount}>{item._count!.documents} doc{item._count!.documents !== 1 ? "s" : ""}</Text>}
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            stickySectionHeadersEnabled
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { ...Typography.heading, fontSize: 28 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceHigh, alignItems: "center", justifyContent: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, marginHorizontal: 20, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15, padding: 0 },
  sectionHeader: { backgroundColor: Colors.bg, paddingHorizontal: 20, paddingVertical: 6 },
  sectionLetter: { color: Colors.primary, fontSize: 13, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.bg },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryMuted, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText: { color: Colors.primary, fontWeight: "700", fontSize: 16 },
  rowInfo: { flex: 1 },
  clientName: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  clientEmail: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  docCount: { color: Colors.textMuted, fontSize: 12 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 72 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { ...Typography.heading, fontSize: 20, textAlign: "center" },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyBtnText: { color: "#000", fontWeight: "700", fontSize: 15 },
});
