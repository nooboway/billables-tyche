import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, fmtCurrency } from "../../theme";
import { fetchClient, deleteClient, ClientWithDocs } from "../../services/clientsApi";
import { StatusBadge } from "../../components/documents/StatusBadge";
import { ClientsStackParamList } from "../../navigation/ClientsStack";
import { DocStatus } from "../../services/documentsApi";

type Route = RouteProp<ClientsStackParamList, "ClientDetail">;
type Nav = NativeStackNavigationProp<ClientsStackParamList>;

export default function ClientDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [client, setClient] = useState<ClientWithDocs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchClient(route.params.id).then(setClient).finally(() => setLoading(false)); }, [route.params.id]);

  function handleDelete() {
    Alert.alert("Delete Client", `Delete ${client?.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteClient(route.params.id); nav.goBack(); } },
    ]);
  }

  if (loading || !client) return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;

  const totalRevenue = client.documents.filter((d) => d.status === "PAID").reduce((s, d) => s + d.total, 0);

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => nav.goBack()}><Ionicons name="arrow-back" size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{client.name}</Text>
        <TouchableOpacity onPress={() => nav.navigate("CreateClient", { id: client.id })}><Ionicons name="create-outline" size={22} color={Colors.text} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.heroSection}>
          <View style={styles.heroAvatar}><Text style={styles.heroAvatarText}>{client.name.charAt(0).toUpperCase()}</Text></View>
          <Text style={styles.heroName}>{client.name}</Text>
          {client.email && <Text style={styles.heroSub}>{client.email}</Text>}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statValue}>{client.documents.length}</Text><Text style={styles.statLabel}>Documents</Text></View>
          <View style={[styles.statCard, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}><Text style={styles.statValue}>{fmtCurrency(totalRevenue)}</Text><Text style={styles.statLabel}>Total Paid</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Details</Text>
          {[["Email", client.email], ["Phone", client.phone], ["Address", client.address_street], ["City", client.address_city], ["Tax Reg No.", client.tax_reg_no]].filter(([, v]) => v).map(([label, value]) => (
            <View key={label as string} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {client.documents.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Documents</Text>
            {client.documents.map((doc, i) => (
              <React.Fragment key={doc.id}>
                <View style={styles.docRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docNumber}>{doc.document_number}</Text>
                    <Text style={styles.docDate}>{new Date(doc.created_at).toLocaleDateString("en-NG")}</Text>
                  </View>
                  <StatusBadge status={doc.status as DocStatus} />
                  <Text style={styles.docAmount}>{fmtCurrency(doc.total)}</Text>
                </View>
                {i < client.documents.length - 1 && <View style={styles.separator} />}
              </React.Fragment>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          <Text style={styles.deleteBtnText}>Delete Client</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bg },
  navbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  navTitle: { ...Typography.heading, fontSize: 17, flex: 1, textAlign: "center", marginHorizontal: 12 },
  heroSection: { alignItems: "center", paddingVertical: 24 },
  heroAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryMuted, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroAvatarText: { color: Colors.primary, fontSize: 28, fontWeight: "700" },
  heroName: { ...Typography.heading, fontSize: 22 },
  heroSub: { color: Colors.textMuted, fontSize: 14, marginTop: 4 },
  statsRow: { flexDirection: "row", backgroundColor: Colors.surface, marginHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, overflow: "hidden" },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statValue: { ...Typography.heading, fontSize: 18, color: Colors.primary },
  statLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: Colors.surface, marginHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 16 },
  cardTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  infoLabel: { color: Colors.textMuted, fontSize: 14 },
  infoValue: { color: Colors.text, fontSize: 14, fontWeight: "500", flex: 1, textAlign: "right" },
  docRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 8 },
  docNumber: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  docDate: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  docAmount: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  separator: { height: 1, backgroundColor: Colors.border },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 20, marginTop: 8, paddingVertical: 14, borderWidth: 1, borderColor: Colors.dangerMuted, borderRadius: 10 },
  deleteBtnText: { color: Colors.danger, fontSize: 15, fontWeight: "600" },
});
