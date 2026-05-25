import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ClientsScreen from "../screens/clients/ClientsScreen";
import ClientDetailScreen from "../screens/clients/ClientDetailScreen";
import CreateClientScreen from "../screens/clients/CreateClientScreen";

export type ClientsStackParamList = {
  ClientsList: undefined;
  ClientDetail: { id: string };
  CreateClient: { id?: string };
};

const Stack = createNativeStackNavigator<ClientsStackParamList>();

export default function ClientsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientsList" component={ClientsScreen} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
      <Stack.Screen name="CreateClient" component={CreateClientScreen} />
    </Stack.Navigator>
  );
}
