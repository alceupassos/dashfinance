"use client";

import { create } from "zustand";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fetchProfile } from "@/lib/api";
import type { Session, User } from "@supabase/supabase-js";

// Keep legacy auth tokens for backwards compatibility with API calls
import {
  AuthTokens,
  clearAuthTokens,
  getAuthTokens,
  isAccessTokenExpired,
  saveAuthTokens,
  setAuthTokens
} from "@/lib/auth";

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
  logout: () => Promise<void>;
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
    set({ status: "loading" });
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Check for existing session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("[auth] Session error:", sessionError);
        clearAuthTokens();
        set({ 
          tokens: null, 
          profile: null, 
          availableCompanies: [], 
          role: "viewer", 
          status: "ready",
          error: null
        });
        return;
      }
      
      if (!session) {
        console.log("[auth] No active session found");
        clearAuthTokens();
        set({ 
          tokens: null, 
          profile: null, 
          availableCompanies: [], 
          role: "viewer", 
          status: "ready",
          error: null
        });
        return;
      }

      // Save tokens for legacy API calls
      const tokens = saveAuthTokens(
        session.access_token,
        session.refresh_token || "",
        session.expires_in || 3600
      );
      
      set({ tokens, status: "loading" });

      // Fetch user profile
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
      } catch (profileError) {
        console.error("[auth] Failed to fetch profile:", profileError);
        // Continue com sessão válida mas sem profile
        set({
          profile: null,
          status: "ready",
          error: "Perfil não carregado. Algumas funcionalidades podem estar limitadas."
        });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        console.log("[auth] Auth state changed:", event);
        if (event === "SIGNED_OUT") {
          clearAuthTokens();
          set({
            tokens: null,
            profile: null,
            availableCompanies: [],
            role: "viewer",
            status: "idle",
            error: null
          });
        } else if (event === "TOKEN_REFRESHED" && session) {
          const tokens = saveAuthTokens(
            session.access_token,
            session.refresh_token || "",
            session.expires_in || 3600
          );
          set({ tokens });
        }
      });
    } catch (error) {
      console.error("[auth] Falha crítica ao inicializar:", error);
      clearAuthTokens();
      set({
        tokens: null,
        profile: null,
        availableCompanies: [],
        role: "viewer",
        status: "ready", // Mudar para ready em vez de error para não bloquear
        error: null // Não mostrar erro para não assustar usuário
      });
    }
  },

  login: async (email: string, password: string) => {
    set({ status: "loading", error: null });
    
    const supabase = getSupabaseBrowserClient();
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error || !data.session) {
        throw new Error(error?.message || "Falha ao fazer login");
      }

      // Save tokens for legacy API calls
      const tokens = saveAuthTokens(
        data.session.access_token,
        data.session.refresh_token || "",
        data.session.expires_in || 3600
      );
      
      set({ tokens });
      
      // Fetch profile
      await get().refreshProfile();
      set({ status: "ready", error: null });
    } catch (error) {
      console.error("[auth] login error", error);
      clearAuthTokens();
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

  logout: async () => {
    const supabase = getSupabaseBrowserClient();
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[auth] logout error", error);
    }
    
    clearAuthTokens();
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
