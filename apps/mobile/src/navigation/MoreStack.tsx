import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MoreScreen from "../screens/more/MoreScreen";
import ProductsScreen from "../screens/products/ProductsScreen";
import ExpensesScreen from "../screens/expenses/ExpensesScreen";
import CreateProductScreen from "../screens/products/CreateProductScreen";
import CreateExpenseScreen from "../screens/expenses/CreateExpenseScreen";

export type MoreStackParamList = {
  MoreHome: undefined;
  Products: undefined;
  CreateProduct: { id?: string };
  Expenses: undefined;
  CreateExpense: { id?: string };
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreHome" component={MoreScreen} />
      <Stack.Screen name="Products" component={ProductsScreen} />
      <Stack.Screen name="CreateProduct" component={CreateProductScreen} />
      <Stack.Screen name="Expenses" component={ExpensesScreen} />
      <Stack.Screen name="CreateExpense" component={CreateExpenseScreen} />
    </Stack.Navigator>
  );
}
