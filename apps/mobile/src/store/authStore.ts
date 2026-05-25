import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthBusiness {
  id: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  business: AuthBusiness | null;
  token: string | null;
  isLoaded: boolean;
  setAuth: (user: AuthUser, business: AuthBusiness, token: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  business: null,
  token: null,
  isLoaded: false,

  setAuth: async (user, business, token) => {
    await SecureStore.setItemAsync("auth_token", token);
    await SecureStore.setItemAsync("auth_user", JSON.stringify(user));
    await SecureStore.setItemAsync("auth_business", JSON.stringify(business));
    set({ user, business, token });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("auth_user");
    await SecureStore.deleteItemAsync("auth_business");
    set({ user: null, business: null, token: null });
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const userRaw = await SecureStore.getItemAsync("auth_user");
      const bizRaw = await SecureStore.getItemAsync("auth_business");
      if (token && userRaw && bizRaw) {
        set({
          token,
          user: JSON.parse(userRaw),
          business: JSON.parse(bizRaw),
          isLoaded: true,
        });
        return;
      }
    } catch {}
    set({ isLoaded: true });
  },
}));
