import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl, Image, Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, fmtCurrency, bpsToPercent } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { fetchProducts, deleteProduct, Product } from "../../services/productsApi";
import { MoreStackParamList } from "../../navigation/MoreStack";

type Nav = NativeStackNavigationProp<MoreStackParamList>;

export default function ProductsScreen() {
  const nav = useNavigation<Nav>();
  const { business } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (q?: string) => {
    if (!business) return;
    try { const data = await fetchProducts(business.id, q); setProducts(data); }
    finally { setLoading(false); setRefreshing(false); }
  }, [business]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => load(query), 300); return () => clearTimeout(t); }, [query, load]);

  function handleDelete(id: string, name: string) {
    Alert.alert("Delete Product", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteProduct(id); load(query); } },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}><Ionicons name="arrow-back" size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Products & Services</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => nav.navigate("CreateProduct", {})}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput style={styles.searchInput} placeholder="Search products..." placeholderTextColor={Colors.textMuted} value={query} onChangeText={setQuery} />
      </View>

      {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        : products.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptyText}>Add products or services to use them in invoices</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => nav.navigate("CreateProduct", {})}><Text style={styles.emptyBtnText}>Add Product</Text></TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(p) => p.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(query); }} tintColor={Colors.primary} />}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: 76 }} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => (
              <View style={styles.row}>
                {item.photo_url
                  ? <Image source={{ uri: item.photo_url }} style={styles.productImage} />
                  : <View style={[styles.productImage, styles.productImagePlaceholder]}><Ionicons name="cube-outline" size={20} color={Colors.textMuted} /></View>
                }
                <View style={styles.rowInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productMeta}>{item.sku ? `SKU: ${item.sku}  ·  ` : ""}Tax: {bpsToPercent(item.tax_pct)}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.price}>{fmtCurrency(item.unit_price)}</Text>
                  {item.unit && <Text style={styles.unit}>/{item.unit}</Text>}
                </View>
                <TouchableOpacity style={styles.editBtn} onPress={() => nav.navigate("CreateProduct", { id: item.id })}>
                  <Ionicons name="create-outline" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
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
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, marginHorizontal: 20, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15, padding: 0 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 },
  productImage: { width: 44, height: 44, borderRadius: 8, marginRight: 12 },
  productImagePlaceholder: { backgroundColor: Colors.surfaceHigh, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1 },
  productName: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  productMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: "flex-end", marginRight: 8 },
  price: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  unit: { color: Colors.textMuted, fontSize: 12 },
  editBtn: { padding: 4 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { ...Typography.heading, fontSize: 20, textAlign: "center" },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyBtnText: { color: "#000", fontWeight: "700", fontSize: 15 },
});
