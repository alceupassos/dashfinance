"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OracleSettings {
  webModel: string;
  whatsappModel: string;
}

const DEFAULT_WEB_MODEL = "chatgpt-5-thinking";
const DEFAULT_WHATSAPP_MODEL = "gpt-4o-mini";

interface OracleConfigState {
  defaults: OracleSettings;
  userSettings: Record<string, OracleSettings>;
  setDefaults: (settings: OracleSettings) => void;
  setUserSettings: (userId: string, settings: OracleSettings) => void;
  getSettingsForUser: (userId?: string | null) => OracleSettings;
}

export const useOracleConfigStore = create<OracleConfigState>()(
  persist(
    (set, get) => ({
      defaults: {
        webModel: DEFAULT_WEB_MODEL,
        whatsappModel: DEFAULT_WHATSAPP_MODEL
      },
      userSettings: {},
      setDefaults: (settings) => set({ defaults: settings }),
      setUserSettings: (userId, settings) =>
        set((state) => ({
          userSettings: { ...state.userSettings, [userId]: settings }
        })),
      getSettingsForUser: (userId) => {
        const state = get();
        if (userId && state.userSettings[userId]) return state.userSettings[userId];
        return state.defaults;
      }
    }),
    {
      name: "oracle-config-store",
      partialize: (state) => ({ defaults: state.defaults, userSettings: state.userSettings })
    }
  )
);
