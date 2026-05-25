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
import { fetchClient, createClient, updateClient } from "../../services/clientsApi";
import { ClientsStackParamList } from "../../navigation/ClientsStack";

type Route = RouteProp<ClientsStackParamList, "CreateClient">;
type Nav = NativeStackNavigationProp<ClientsStackParamList>;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  tax_reg_no: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CreateClientScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { business } = useAuthStore();
  const isEdit = !!route.params?.id;

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", address_street: "", address_city: "", tax_reg_no: "" },
  });

  useEffect(() => {
    if (route.params?.id) {
      fetchClient(route.params.id).then((c) => reset({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", address_street: c.address_street ?? "", address_city: c.address_city ?? "", tax_reg_no: c.tax_reg_no ?? "" }));
    }
  }, [route.params?.id, reset]);

  async function onSubmit(data: FormData) {
    if (!business) return;
    const payload = { business_id: business.id, name: data.name, email: data.email || null, phone: data.phone || null, address_street: data.address_street || null, address_city: data.address_city || null, tax_reg_no: data.tax_reg_no || null };
    if (isEdit) await updateClient(route.params!.id!, payload);
    else await createClient(payload);
    nav.goBack();
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={styles.navCancel}>Cancel</Text></TouchableOpacity>
        <Text style={styles.navTitle}>{isEdit ? "Edit Client" : "New Client"}</Text>
        <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={Colors.primary} size="small" /> : <Text style={styles.navSave}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {([
          { name: "name", label: "Name", placeholder: "Client name" },
          { name: "email", label: "Email", placeholder: "email@example.com", keyboardType: "email-address", autoCapitalize: "none" },
          { name: "phone", label: "Phone", placeholder: "+234 800 000 0000", keyboardType: "phone-pad" },
          { name: "address_street", label: "Street Address", placeholder: "123 Main Street" },
          { name: "address_city", label: "City", placeholder: "Lagos" },
          { name: "tax_reg_no", label: "Tax Reg No.", placeholder: "Optional", autoCapitalize: "characters" },
        ] as any[]).map((f) => (
          <Controller key={f.name} control={control} name={f.name}
            render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput style={[styles.input, error && styles.inputError]} value={value} onChangeText={onChange} onBlur={onBlur} placeholder={f.placeholder} placeholderTextColor={Colors.textMuted} keyboardType={f.keyboardType ?? "default"} autoCapitalize={f.autoCapitalize ?? "words"} />
                {error && <Text style={styles.error}>{error.message}</Text>}
              </View>
            )}
          />
        ))}
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
  field: { marginBottom: 16 },
  label: { color: Colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 },
  input: { backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15 },
  inputError: { borderColor: Colors.danger },
  error: { color: Colors.danger, fontSize: 12, marginTop: 4 },
});
