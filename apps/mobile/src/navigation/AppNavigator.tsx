import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/authStore";
import { Colors } from "../theme";
import TabNavigator from "./TabNavigator";
import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import DocumentDetailScreen from "../screens/documents/DocumentDetailScreen";
import CreateDocumentScreen from "../screens/documents/CreateDocumentScreen";
import ClientDetailScreen from "../screens/clients/ClientDetailScreen";
import CreateClientScreen from "../screens/clients/CreateClientScreen";
import CreateProductScreen from "../screens/products/CreateProductScreen";
import CreateExpenseScreen from "../screens/expenses/CreateExpenseScreen";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AuthStack = createNativeStackNavigator();

export default function AppNavigator() {
  const { token, isLoaded, loadFromStorage } = useAuthStore();

  useEffect(() => { loadFromStorage(); }, []);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!token) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Signup" component={SignupScreen} />
      </AuthStack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} />
      <Stack.Screen name="CreateDocument" component={CreateDocumentScreen} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
      <Stack.Screen name="CreateClient" component={CreateClientScreen} />
      <Stack.Screen name="CreateProduct" component={CreateProductScreen} />
      <Stack.Screen name="CreateExpense" component={CreateExpenseScreen} />
    </Stack.Navigator>
  );
}
