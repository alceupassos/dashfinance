"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getOracleSettings,
  updateOracleSettings,
  OracleSettingsResponse,
  OracleSettingsPayload
} from "@/lib/api";

export interface OracleSettings {
  webModel: string;
  whatsappModel: string;
}

const DEFAULT_WEB = "chatgpt-5-thinking";
const DEFAULT_WHATSAPP = "gpt-4o-mini";

function toLocal(
  payload: OracleSettingsResponse,
  defaults: OracleSettings
): OracleSettings {
  return {
    webModel: payload.web_model ?? defaults.webModel,
    whatsappModel: payload.whatsapp_model ?? defaults.whatsappModel
  };
}

function toPayload(settings: OracleSettings): OracleSettingsPayload {
  return {
    web_model: settings.webModel,
    whatsapp_model: settings.whatsappModel
  };
}

interface OracleConfigState {
  defaults: OracleSettings;
  userSettings: Record<string, OracleSettings>;
  loading: boolean;
  remoteError: string | null;
  setDefaults: (settings: OracleSettings) => void;
  setUserSettings: (userId: string, settings: OracleSettings) => void;
  getSettingsForUser: (userId?: string | null) => OracleSettings;
  fetchUserSettings: (userId?: string | null) => Promise<void>;
  persistUserSettings: (userId: string, settings: OracleSettings) => Promise<void>;
}

export const useOracleConfigStore = create<OracleConfigState>()(
  persist(
    (set, get) => ({
      defaults: {
        webModel: DEFAULT_WEB,
        whatsappModel: DEFAULT_WHATSAPP
      },
      userSettings: {},
      loading: false,
      remoteError: null,
      setDefaults: (settings) => set({ defaults: settings }),
      setUserSettings: (userId, settings) =>
        set((state) => ({
          userSettings: { ...state.userSettings, [userId]: settings }
        })),
      getSettingsForUser: (userId) => {
        const state = get();
        if (userId && state.userSettings[userId]) {
          return state.userSettings[userId];
        }
        return state.defaults;
      },
      fetchUserSettings: async (userId) => {
        if (!userId) return;
        set({ loading: true, remoteError: null });
        try {
          const response = await getOracleSettings(userId);
          const settings = toLocal(response, get().defaults);
          set((state) => ({
            userSettings: { ...state.userSettings, [userId]: settings }
          }));
        } catch (error) {
          set({
            remoteError: error instanceof Error ? error.message : "Falha ao carregar preferências"
          });
        } finally {
          set({ loading: false });
        }
      },
      persistUserSettings: async (userId, settings) => {
        if (!userId) return;
        set({ loading: true, remoteError: null });
        try {
          await updateOracleSettings({
            user_id: userId,
            ...toPayload(settings)
          });
          set((state) => ({
            userSettings: { ...state.userSettings, [userId]: settings }
          }));
        } catch (error) {
          set({
            remoteError: error instanceof Error ? error.message : "Falha ao salvar preferências"
          });
          throw error;
        } finally {
          set({ loading: false });
        }
      }
    }),
    {
      name: "oracle-config-store",
      partialize: (state) => ({
        defaults: state.defaults,
        userSettings: state.userSettings
      })
    }
  )
);
