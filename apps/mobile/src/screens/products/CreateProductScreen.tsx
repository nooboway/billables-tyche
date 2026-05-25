import React, { useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Colors, Typography } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { fetchProducts, createProduct, updateProduct } from "../../services/productsApi";
import { MoreStackParamList } from "../../navigation/MoreStack";

type Route = RouteProp<MoreStackParamList, "CreateProduct">;
type Nav = NativeStackNavigationProp<MoreStackParamList>;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  unit_price_display: z.string().min(1, "Price is required"),
  unit: z.string().optional(),
  sku: z.string().optional(),
  tax_pct_display: z.string().default("7.5"),
});
type FormData = z.infer<typeof schema>;

export default function CreateProductScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { business } = useAuthStore();
  const isEdit = !!route.params?.id;

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", unit_price_display: "", unit: "", sku: "", tax_pct_display: "7.5" },
  });

  useEffect(() => {
    if (route.params?.id && business) {
      fetchProducts(business.id).then((list) => {
        const p = list.find((x) => x.id === route.params!.id);
        if (p) reset({ name: p.name, description: p.description ?? "", unit_price_display: (p.unit_price / 100).toString(), unit: p.unit ?? "", sku: p.sku ?? "", tax_pct_display: (p.tax_pct / 100).toString() });
      });
    }
  }, [route.params?.id, business, reset]);

  async function onSubmit(data: FormData) {
    if (!business) return;
    const payload = { business_id: business.id, name: data.name, description: data.description || null, unit_price: Math.round(parseFloat(data.unit_price_display) * 100), unit: data.unit || null, sku: data.sku || null, tax_pct: Math.round(parseFloat(data.tax_pct_display) * 100), photo_url: null };
    if (isEdit) await updateProduct(route.params!.id!, payload);
    else await createProduct(payload);
    nav.goBack();
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={styles.navCancel}>Cancel</Text></TouchableOpacity>
        <Text style={styles.navTitle}>{isEdit ? "Edit Product" : "New Product"}</Text>
        <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={Colors.primary} size="small" /> : <Text style={styles.navSave}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {([
          { name: "name", label: "Name", placeholder: "Product or service name" },
          { name: "description", label: "Description", placeholder: "Optional description", multiline: true },
        ] as any[]).map((f) => (
          <Controller key={f.name} control={control} name={f.name}
            render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput style={[styles.input, f.multiline && { height: 72, textAlignVertical: "top" }, error && styles.inputError]} value={value} onChangeText={onChange} onBlur={onBlur} placeholder={f.placeholder} placeholderTextColor={Colors.textMuted} multiline={f.multiline} />
                {error && <Text style={styles.error}>{error.message}</Text>}
              </View>
            )}
          />
        ))}

        <View style={styles.row}>
          <Controller control={control} name="unit_price_display"
            render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
              <View style={[styles.field, { flex: 2, marginRight: 8 }]}>
                <Text style={styles.label}>Unit Price (₦)</Text>
                <TextInput style={[styles.input, error && styles.inputError]} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="0.00" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                {error && <Text style={styles.error}>{error.message}</Text>}
              </View>
            )}
          />
          <Controller control={control} name="unit"
            render={({ field: { value, onChange } }) => (
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Unit</Text>
                <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="hr / pcs" placeholderTextColor={Colors.textMuted} />
              </View>
            )}
          />
        </View>

        <View style={styles.row}>
          <Controller control={control} name="sku"
            render={({ field: { value, onChange } }) => (
              <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>SKU</Text>
                <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Optional" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" />
              </View>
            )}
          />
          <Controller control={control} name="tax_pct_display"
            render={({ field: { value, onChange } }) => (
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Tax %</Text>
                <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="7.5" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
              </View>
            )}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  navbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  navCancel: { color: Colors.textMuted, fontSize: 16 },
  navTitle: { ...Typography.heading, fontSize: 17 },
  navSave: { color: Colors.primary, fontSize: 16, fontWeight: "700" },
  form: { padding: 20, paddingBottom: 60 },
  row: { flexDirection: "row" },
  field: { marginBottom: 16 },
  label: { color: Colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 },
  input: { backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15 },
  inputError: { borderColor: Colors.danger },
  error: { color: Colors.danger, fontSize: 12, marginTop: 4 },
});
