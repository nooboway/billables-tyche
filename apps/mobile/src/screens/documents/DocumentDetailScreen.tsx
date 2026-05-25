import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, fmtCurrency, bpsToPercent } from "../../theme";
import { fetchDocument, updateDocumentStatus, downloadPdf, Document, DocStatus } from "../../services/documentsApi";
import { StatusBadge } from "../../components/documents/StatusBadge";
import { RootStackParamList } from "../../navigation/types";

type Route = RouteProp<RootStackParamList, "DocumentDetail">;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const NEXT_ACTIONS: Record<DocStatus, { label: string; next: DocStatus; color: string }[]> = {
  DRAFT:     [{ label: "Mark as Sent", next: "SENT", color: Colors.primary }, { label: "Cancel", next: "CANCELLED", color: Colors.danger }],
  SENT:      [{ label: "Mark as Paid", next: "PAID", color: Colors.success }, { label: "Mark Overdue", next: "OVERDUE", color: Colors.warning }, { label: "Cancel", next: "CANCELLED", color: Colors.danger }],
  OVERDUE:   [{ label: "Mark as Paid", next: "PAID", color: Colors.success }, { label: "Cancel", next: "CANCELLED", color: Colors.danger }],
  PAID:      [],
  CANCELLED: [],
};

const HISTORY_EVENTS = (doc: Document) => [
  { label: "Created", date: doc.created_at },
  doc.sent_at ? { label: "Sent", date: doc.sent_at } : null,
  doc.paid_at ? { label: "Paid", date: doc.paid_at } : null,
].filter(Boolean) as { label: string; date: string }[];

export default function DocumentDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"summary" | "history">("summary");

  useEffect(() => {
    fetchDocument(route.params.id).then(setDoc).finally(() => setLoading(false));
  }, [route.params.id]);

  async function handleStatus(next: DocStatus) {
    if (!doc) return;
    const updated = await updateDocumentStatus(doc.id, next);
    setDoc(updated as any);
  }

  if (loading || !doc) {
    return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{doc.document_number}</Text>
        <TouchableOpacity onPress={() => downloadPdf(doc.id, doc.document_number)}>
          <Ionicons name="download-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        {(["summary", "history"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {tab === "summary" && (
          <>
            <View style={styles.infoGrid}>
              {[
                { label: "Status", value: <StatusBadge status={doc.status} /> },
                { label: "Client", value: doc.client?.name ?? "—" },
                { label: "Issue Date", value: new Date(doc.issue_date).toLocaleDateString("en-NG") },
                { label: "Due Date", value: doc.due_date ? new Date(doc.due_date).toLocaleDateString("en-NG") : "—" },
              ].map((item) => (
                <View key={item.label} style={styles.infoCard}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  {typeof item.value === "string"
                    ? <Text style={styles.infoValue}>{item.value}</Text>
                    : item.value}
                </View>
              ))}
            </View>

            <View style={styles.totalsCard}>
              {[
                { label: "Subtotal", value: fmtCurrency(doc.subtotal) },
                ...(doc.discount_amount > 0 ? [{ label: "Discount", value: `-${fmtCurrency(doc.discount_amount)}` }] : []),
                { label: `Tax (${bpsToPercent(doc.tax_pct)})`, value: fmtCurrency(doc.tax_amount) },
              ].map((row) => (
                <View key={row.label} style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>{row.label}</Text>
                  <Text style={styles.totalsValue}>{row.value}</Text>
                </View>
              ))}
              <View style={[styles.totalsRow, styles.totalFinal]}>
                <Text style={styles.totalFinalLabel}>Total</Text>
                <Text style={styles.totalFinalValue}>{fmtCurrency(doc.total)}</Text>
              </View>
            </View>

            {doc.status === "DRAFT" && (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => nav.navigate("CreateDocument", { id: doc.id })}
              >
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.editBtnText}>Edit Document</Text>
              </TouchableOpacity>
            )}

            <View style={styles.actionsRow}>
              {NEXT_ACTIONS[doc.status].map((action) => (
                <TouchableOpacity
                  key={action.next}
                  style={[styles.actionBtn, { borderColor: action.color }]}
                  onPress={() => handleStatus(action.next)}
                >
                  <Text style={[styles.actionBtnText, { color: action.color }]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {tab === "history" && (
          <View style={styles.timeline}>
            {HISTORY_EVENTS(doc).map((ev, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                {i < HISTORY_EVENTS(doc).length - 1 && <View style={styles.timelineLine} />}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>{ev.label}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(ev.date).toLocaleString("en-NG")}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bg },
  navbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  navTitle: { ...Typography.heading, fontSize: 17 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border, marginHorizontal: 20 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: 14 },
  tabTextActive: { color: Colors.primary, fontWeight: "700" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", padding: 20, gap: 12 },
  infoCard: {
    width: "47%", backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12,
  },
  infoLabel: { color: Colors.textMuted, fontSize: 11, marginBottom: 6, textTransform: "uppercase" },
  infoValue: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  totalsCard: {
    backgroundColor: Colors.surface, marginHorizontal: 20,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 16,
  },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  totalsLabel: { color: Colors.textMuted, fontSize: 14 },
  totalsValue: { color: Colors.text, fontSize: 14 },
  totalFinal: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 6 },
  totalFinalLabel: { color: Colors.text, fontSize: 16, fontWeight: "700" },
  totalFinalValue: { color: Colors.primary, fontSize: 16, fontWeight: "700" },
  editBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: 20, marginBottom: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.primary, borderRadius: 8,
  },
  editBtnText: { color: Colors.primary, fontSize: 14, fontWeight: "600" },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 10 },
  actionBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  timeline: { padding: 24 },
  timelineItem: { flexDirection: "row", marginBottom: 24 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, marginTop: 3, marginRight: 12 },
  timelineLine: { position: "absolute", left: 5, top: 15, width: 2, height: "100%", backgroundColor: Colors.border },
  timelineContent: { flex: 1 },
  timelineLabel: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  timelineDate: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
});
