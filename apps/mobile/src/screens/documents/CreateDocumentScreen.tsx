import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, fmtCurrency } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { fetchDocument, createDocument, updateDocument, DocType } from "../../services/documentsApi";
import { RootStackParamList } from "../../navigation/types";

type Route = RouteProp<RootStackParamList, "CreateDocument">;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const DOC_TYPES: { label: string; value: DocType }[] = [
  { label: "Invoice", value: "INVOICE" },
  { label: "Estimate", value: "ESTIMATE" },
  { label: "Pro Forma", value: "PROFORMA" },
  { label: "Delivery Note", value: "DELIVERY_NOTE" },
  { label: "Purchase Order", value: "PURCHASE_ORDER" },
];

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.string(),
  unit_price: z.string(),
  tax_pct: z.string().default("7.5"),
});

const schema = z.object({
  notes: z.string().optional(),
  discount_pct: z.string().default("0"),
  items: z.array(lineItemSchema).min(1),
});

type FormData = z.infer<typeof schema>;

export default function CreateDocumentScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { business } = useAuthStore();
  const isEdit = !!route.params?.id;

  const [docType, setDocType] = useState<DocType>((route.params?.type as DocType) ?? "INVOICE");
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { control, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { notes: "", discount_pct: "0", items: [{ description: "", quantity: "1", unit_price: "", tax_pct: "7.5" }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  useEffect(() => {
    if (route.params?.id) {
      fetchDocument(route.params.id).then((doc) => {
        setDocType(doc.type);
        if (doc.due_date) setDueDate(new Date(doc.due_date));
        reset({
          notes: doc.notes ?? "",
          discount_pct: (doc.discount_pct / 100).toString(),
          items: (doc.items ?? []).map((item) => ({
            description: item.description,
            quantity: item.quantity.toString(),
            unit_price: (item.unit_price / 100).toString(),
            tax_pct: (item.tax_pct / 100).toString(),
          })),
        });
      });
    }
  }, [route.params?.id, reset]);

  const subtotal = watchedItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return sum + qty * price * 100;
  }, 0);

  async function onSubmit(data: FormData) {
    if (!business) return;
    const items = data.items.map((item, i) => ({
      description: item.description,
      quantity: parseInt(item.quantity) || 1,
      unit_price: Math.round(parseFloat(item.unit_price) * 100),
      tax_pct: Math.round(parseFloat(item.tax_pct) * 100),
      sort_order: i,
    }));
    const payload = {
      business_id: business.id,
      type: docType,
      discount_pct: Math.round(parseFloat(data.discount_pct) * 100),
      tax_pct: 750,
      notes: data.notes || null,
      due_date: dueDate?.toISOString() ?? null,
      items,
    };
    if (isEdit) {
      await updateDocument(route.params!.id!, payload);
    } else {
      await createDocument(payload);
    }
    nav.goBack();
  }

  const typeLabel = DOC_TYPES.find((t) => t.value === docType)?.label ?? "Invoice";

  return (
    <View style={styles.container}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.navCancel}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.typePickerBtn} onPress={() => setShowTypeSheet(!showTypeSheet)}>
          <Text style={styles.navTitle}>{`NEW ${typeLabel.toUpperCase()}`}</Text>
          <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={Colors.primary} size="small" /> : <Text style={styles.navSave}>Save</Text>}
        </TouchableOpacity>
      </View>

      {/* Type sheet */}
      {showTypeSheet && (
        <View style={styles.typeSheet}>
          {DOC_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={styles.typeRow}
              onPress={() => { setDocType(t.value); setShowTypeSheet(false); }}
            >
              <Text style={[styles.typeRowText, docType === t.value && { color: Colors.primary }]}>{t.label}</Text>
              {docType === t.value && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {/* Due date */}
        <View style={s.wrap}>
          <Text style={s.label}>Due Date</Text>
          <TouchableOpacity style={[s.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: dueDate ? Colors.text : Colors.textMuted, fontSize: 15 }}>
              {dueDate ? dueDate.toLocaleDateString("en-NG") : "Select date"}
            </Text>
            <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={dueDate ?? new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_e, d) => {
              setShowDatePicker(Platform.OS === "ios");
              if (d) setDueDate(d);
            }}
          />
        )}

        {/* Line items */}
        <Text style={styles.sectionLabel}>Line Items</Text>
        {fields.map((field, index) => (
          <View key={field.id} style={styles.lineItem}>
            <Controller
              control={control}
              name={`items.${index}.description`}
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.descInput}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Description"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
              )}
            />
            <View style={styles.lineRow}>
              {(["quantity", "unit_price", "tax_pct"] as const).map((fname) => (
                <Controller
                  key={fname}
                  control={control}
                  name={`items.${index}.${fname}`}
                  render={({ field: { value, onChange } }) => (
                    <View style={styles.lineField}>
                      <Text style={styles.lineFieldLabel}>
                        {fname === "quantity" ? "Qty" : fname === "unit_price" ? "Price" : "Tax%"}
                      </Text>
                      <TextInput
                        style={styles.lineInput}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  )}
                />
              ))}
              {fields.length > 1 && (
                <TouchableOpacity onPress={() => remove(index)} style={styles.removeBtn}>
                  <Ionicons name="close" size={16} color={Colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addItemBtn} onPress={() => append({ description: "", quantity: "1", unit_price: "", tax_pct: "7.5" })}>
          <Ionicons name="add" size={16} color={Colors.primary} />
          <Text style={styles.addItemText}>Add Line Item</Text>
        </TouchableOpacity>

        {/* Notes */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { value, onChange } }) => (
            <View style={s.wrap}>
              <Text style={s.label}>Notes</Text>
              <TextInput
                style={[s.input, { height: 72, textAlignVertical: "top" }]}
                value={value}
                onChangeText={onChange}
                placeholder="Optional payment instructions or notes"
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </View>
          )}
        />
      </ScrollView>

      {/* Sticky totals */}
      <View style={styles.totalsBar}>
        <Text style={styles.totalsLabel}>Subtotal</Text>
        <Text style={styles.totalsValue}>{fmtCurrency(subtotal)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { color: Colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  navbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  navCancel: { color: Colors.textMuted, fontSize: 16 },
  typePickerBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  navTitle: { ...Typography.heading, fontSize: 15 },
  navSave: { color: Colors.primary, fontSize: 16, fontWeight: "700" },
  typeSheet: {
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  typeRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  typeRowText: { color: Colors.text, fontSize: 15 },
  form: { padding: 20, paddingBottom: 120 },
  sectionLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 10 },
  lineItem: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: 12, marginBottom: 10,
  },
  descInput: {
    color: Colors.text, fontSize: 15, paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 8,
  },
  lineRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  lineField: { flex: 1 },
  lineFieldLabel: { color: Colors.textMuted, fontSize: 10, marginBottom: 4 },
  lineInput: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 8, color: Colors.text, fontSize: 13, textAlign: "right",
  },
  removeBtn: { padding: 4 },
  addItemBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingVertical: 12, marginBottom: 16, borderStyle: "dashed",
  },
  addItemText: { color: Colors.primary, fontSize: 14, fontWeight: "600" },
  totalsBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
  },
  totalsLabel: { color: Colors.textMuted, fontSize: 14 },
  totalsValue: { color: Colors.text, fontSize: 18, fontWeight: "700" },
});
