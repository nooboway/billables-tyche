import React from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Colors, Typography } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const nav = useNavigation<NativeStackNavigationProp<any>>();
  const { setAuth } = useAuthStore();

  const { control, handleSubmit, setError, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post("/auth/login", data);
      await setAuth(res.data.user, res.data.business, res.data.token);
    } catch (e: any) {
      setError("password", { message: e.response?.data?.error ?? "Login failed" });
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.wordmark}>Billables</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.card}>
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {error && <Text style={styles.error}>{error.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                />
                {error && <Text style={styles.error}>{error.message}</Text>}
              </View>
            )}
          />

          <TouchableOpacity style={styles.btn} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => nav.navigate("Signup")} style={styles.switchLink}>
          <Text style={styles.switchText}>
            Don't have an account? <Text style={{ color: Colors.primary }}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, justifyContent: "center", padding: 24 },
  wordmark: { color: Colors.text, fontSize: 36, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  subtitle: { color: Colors.textMuted, fontSize: 15, textAlign: "center", marginBottom: 32 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, padding: 24,
  },
  field: { marginBottom: 16 },
  label: { color: Colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase" },
  input: {
    backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15,
  },
  inputError: { borderColor: Colors.danger },
  error: { color: Colors.danger, fontSize: 12, marginTop: 4 },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingVertical: 14, alignItems: "center", marginTop: 8,
  },
  btnText: { color: "#000", fontWeight: "700", fontSize: 16 },
  switchLink: { marginTop: 24, alignItems: "center" },
  switchText: { color: Colors.textMuted, fontSize: 14 },
});
