import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Switch, Modal,
  FlatList, Image, Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { fetchExpenses, fetchCategories, createExpense, updateExpense } from "../../services/expensesApi";
import { MoreStackParamList } from "../../navigation/MoreStack";

type Route = RouteProp<MoreStackParamList, "CreateExpense">;
type Nav = NativeStackNavigationProp<MoreStackParamList>;

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  amount_display: z.string().min(1, "Amount is required"),
  tax_pct_display: z.string().default("0"),
  category: z.string().min(1, "Category is required"),
  paid: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

export default function CreateExpenseScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { business } = useAuthStore();
  const isEdit = !!route.params?.id;

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const { control, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", amount_display: "", tax_pct_display: "0", category: "", paid: true },
  });

  const selectedCategory = watch("category");

  useEffect(() => {
    fetchCategories().then(setCategories);
    if (route.params?.id && business) {
      fetchExpenses(business.id).then((list) => {
        const e = list.find((x) => x.id === route.params!.id);
        if (e) {
          reset({ title: e.title, description: e.description ?? "", amount_display: (e.amount / 100).toString(), tax_pct_display: (e.tax_pct / 100).toString(), category: e.category, paid: e.paid });
          setDate(new Date(e.date));
          setPhotoUri(e.photo_url);
        }
      });
    }
  }, [route.params?.id, business, reset]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  async function onSubmit(data: FormData) {
    if (!business) return;
    const payload = { business_id: business.id, title: data.title, description: data.description || null, amount: Math.round(parseFloat(data.amount_display) * 100), tax_pct: Math.round(parseFloat(data.tax_pct_display) * 100), category: data.category, date: date.toISOString(), paid: data.paid, photo_url: photoUri, currency: "NGN" };
    if (isEdit) await updateExpense(route.params!.id!, payload);
    else await createExpense(payload);
    nav.goBack();
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={styles.navCancel}>Cancel</Text></TouchableOpacity>
        <Text style={styles.navTitle}>{isEdit ? "Edit Expense" : "New Expense"}</Text>
        <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={Colors.primary} size="small" /> : <Text style={styles.navSave}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Controller control={control} name="title"
          render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
            <View style={s.wrap}>
              <Text style={s.label}>Title</Text>
              <TextInput style={[s.input, error && s.inputError]} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="e.g. Office rent" placeholderTextColor={Colors.textMuted} />
              {error && <Text style={s.error}>{error.message}</Text>}
            </View>
          )}
        />

        <View style={styles.row}>
          <Controller control={control} name="amount_display"
            render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
              <View style={[s.wrap, { flex: 2, marginRight: 8 }]}>
                <Text style={s.label}>Amount (₦)</Text>
                <TextInput style={[s.input, error && s.inputError]} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="0.00" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                {error && <Text style={s.error}>{error.message}</Text>}
              </View>
            )}
          />
          <Controller control={control} name="tax_pct_display"
            render={({ field: { value, onChange } }) => (
              <View style={[s.wrap, { flex: 1 }]}>
                <Text style={s.label}>Tax %</Text>
                <TextInput style={s.input} value={value} onChangeText={onChange} placeholder="0" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
              </View>
            )}
          />
        </View>

        <View style={s.wrap}>
          <Text style={s.label}>Category</Text>
          <TouchableOpacity style={[s.input, styles.pickerRow]} onPress={() => setShowCategoryModal(true)}>
            <Text style={{ color: selectedCategory ? Colors.text : Colors.textMuted, fontSize: 15 }}>{selectedCategory || "Select category"}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={s.wrap}>
          <Text style={s.label}>Date</Text>
          <TouchableOpacity style={[s.input, styles.pickerRow]} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: Colors.text, fontSize: 15 }}>{date.toLocaleDateString("en-NG")}</Text>
            <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker value={date} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_e, d) => { setShowDatePicker(Platform.OS === "ios"); if (d) setDate(d); }}
          />
        )}

        <Controller control={control} name="description"
          render={({ field: { value, onChange } }) => (
            <View style={s.wrap}>
              <Text style={s.label}>Description (optional)</Text>
              <TextInput style={[s.input, { height: 72, textAlignVertical: "top" }]} value={value} onChangeText={onChange} placeholder="Notes about this expense" placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} />
            </View>
          )}
        />

        <View style={styles.paidRow}>
          <View>
            <Text style={styles.paidLabel}>Mark as Paid</Text>
            <Text style={styles.paidSub}>Toggle off to track as outstanding</Text>
          </View>
          <Controller control={control} name="paid"
            render={({ field: { value, onChange } }) => (
              <Switch value={value} onValueChange={onChange} trackColor={{ false: Colors.surfaceHigh, true: Colors.successMuted }} thumbColor={value ? Colors.success : Colors.textMuted} />
            )}
          />
        </View>

        <View style={s.wrap}>
          <Text style={s.label}>Receipt Photo</Text>
          {photoUri ? (
            <View>
              <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotoUri(null)}>
                <Ionicons name="close-circle" size={22} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                <Ionicons name="image-outline" size={20} color={Colors.primary} />
                <Text style={styles.photoBtnText}>Library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={20} color={Colors.primary} />
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showCategoryModal} transparent animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}><Ionicons name="close" size={22} color={Colors.text} /></TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(c) => c}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.categoryRow} onPress={() => { setValue("category", item); setShowCategoryModal(false); }}>
                  <Text style={[styles.categoryText, selectedCategory === item && styles.categoryTextActive]}>{item}</Text>
                  {selectedCategory === item && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border }} />}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { color: Colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 },
  input: { backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15 },
  inputError: { borderColor: Colors.danger },
  error: { color: Colors.danger, fontSize: 12, marginTop: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  navbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  navCancel: { color: Colors.textMuted, fontSize: 16 },
  navTitle: { ...Typography.heading, fontSize: 17 },
  navSave: { color: Colors.primary, fontSize: 16, fontWeight: "700" },
  form: { padding: 20, paddingBottom: 60 },
  row: { flexDirection: "row" },
  pickerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  paidRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16 },
  paidLabel: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  paidSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  previewImage: { width: "100%", height: 180, borderRadius: 10 },
  removePhoto: { position: "absolute", top: 8, right: 8 },
  photoButtons: { flexDirection: "row", gap: 12 },
  photoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 14, borderStyle: "dashed" },
  photoBtnText: { color: Colors.primary, fontSize: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "60%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { ...Typography.heading, fontSize: 17 },
  categoryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
  categoryText: { color: Colors.text, fontSize: 15 },
  categoryTextActive: { color: Colors.primary, fontWeight: "700" },
});
