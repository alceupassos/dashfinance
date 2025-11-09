"use client";

import { create } from "zustand";
import { AnalysisStyle } from "./use-dashboard-store";

interface OracleMessage {
  id: string;
  question: string;
  answer: string;
  createdAt: Date;
  style: AnalysisStyle;
}

interface AiOracleState {
  open: boolean;
  history: OracleMessage[];
  setOpen: (open: boolean) => void;
  addMessage: (message: OracleMessage) => void;
  reset: () => void;
}

export const useAiOracleStore = create<AiOracleState>((set) => ({
  open: false,
  history: [],
  setOpen: (open) => set({ open }),
  addMessage: (message) =>
    set((state) => ({
      history: [message, ...state.history].slice(0, 30)
    })),
  reset: () => set({ history: [] })
}));
