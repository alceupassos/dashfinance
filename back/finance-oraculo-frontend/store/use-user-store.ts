"use client";

import { create } from "zustand";
import {
  AuthTokens,
  clearAuthTokens,
  getAuthTokens,
  isAccessTokenExpired,
  saveAuthTokens,
  setAuthTokens
} from "@/lib/auth";
import { fetchProfile, postAuthLogin } from "@/lib/api";
import { clearSessionCookie, setSessionCookie } from "@/lib/session-cookie";

export type UserRole = "admin" | "executivo_conta" | "franqueado" | "cliente" | "viewer";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: UserRole;
  twoFactorEnabled?: boolean;
  defaultCompanyCnpj?: string | null;
  availableCompanies: string[];
}

type SessionStatus = "idle" | "loading" | "ready" | "error";

interface UserState {
  tokens: AuthTokens | null;
  profile: UserProfile | null;
  role: UserRole;
  availableCompanies: string[];
  status: SessionStatus;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: Partial<UserProfile>) => void;
  setAvailableCompanies: (companies: string[]) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  tokens: null,
  profile: null,
  role: "viewer",
  availableCompanies: [],
  status: "idle",
  error: null,

  initialize: async () => {
    const stored = getAuthTokens();
    if (!stored || isAccessTokenExpired(stored)) {
      clearAuthTokens();
      clearSessionCookie();
      set({ tokens: null, profile: null, availableCompanies: [], role: "viewer", status: "ready" });
      return;
    }

    setAuthTokens(stored);
    setSessionCookie();
    set({ tokens: stored, status: "loading" });
    try {
      const profile = await fetchProfile();
      const mapped: UserProfile = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatar_url ?? undefined,
        role: (profile.role as UserRole) ?? "viewer",
        twoFactorEnabled: profile.two_factor_enabled,
        defaultCompanyCnpj: profile.default_company_cnpj ?? undefined,
        availableCompanies: profile.available_companies ?? []
      };
      set({
        profile: mapped,
        availableCompanies: mapped.availableCompanies,
        role: mapped.role,
        status: "ready",
        error: null
      });
    } catch (error) {
      console.error("[auth] Falha ao carregar perfil:", error);
      clearAuthTokens();
      set({
        tokens: null,
        profile: null,
        availableCompanies: [],
        role: "viewer",
        status: "error",
        error: "Não foi possível carregar o perfil. Faça login novamente."
      });
    }
  },

  login: async (email: string, password: string) => {
    set({ status: "loading", error: null });
    try {
      const response = await postAuthLogin({ email, password });
      const tokens = saveAuthTokens(response.access_token, response.refresh_token, response.expires_in);
      set({ tokens });
      setSessionCookie();
      await get().refreshProfile();
      set({ status: "ready", error: null });
    } catch (error) {
      console.error("[auth] login error", error);
      clearAuthTokens();
      clearSessionCookie();
      set({
        tokens: null,
        profile: null,
        availableCompanies: [],
        role: "viewer",
        status: "error",
        error: "Credenciais inválidas ou erro ao autenticar."
      });
      throw error;
    }
  },

  logout: () => {
    clearAuthTokens();
    clearSessionCookie();
    set({
      tokens: null,
      profile: null,
      availableCompanies: [],
      role: "viewer",
      status: "idle",
      error: null
    });
  },

  refreshProfile: async () => {
    try {
      const profile = await fetchProfile();
      const mapped: UserProfile = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatar_url ?? undefined,
        role: (profile.role as UserRole) ?? "viewer",
        twoFactorEnabled: profile.two_factor_enabled,
        defaultCompanyCnpj: profile.default_company_cnpj ?? undefined,
        availableCompanies: profile.available_companies ?? []
      };
      set({
        profile: mapped,
        availableCompanies: mapped.availableCompanies,
        role: mapped.role
      });
    } catch (error) {
      console.error("[auth] refreshProfile error", error);
      throw error;
    }
  },

  setProfile: (partial) =>
    set((state) => {
      if (!state.profile) return state;
      const updated = { ...state.profile, ...partial };
      return {
        profile: updated,
        role: updated.role,
        availableCompanies: updated.availableCompanies ?? state.availableCompanies
      };
    }),

  setAvailableCompanies: (companies) =>
    set((state) => ({
      availableCompanies: companies,
      profile: state.profile
        ? { ...state.profile, availableCompanies: companies }
        : state.profile
    }))
}));
