"use client";

import { create } from "zustand";

export type TargetType = "cnpj" | "alias";

export interface SelectedTarget {
  type: TargetType;
  value: string;
}

export interface PeriodRange {
  from: string;
  to: string;
}

export type AnalysisStyle = "creative" | "technical";

interface DashboardState {
  selectedTarget: SelectedTarget;
  period: PeriodRange;
  analysisStyle: AnalysisStyle;
  setTarget: (target: SelectedTarget) => void;
  setPeriod: (period: PeriodRange) => void;
  setAnalysisStyle: (style: AnalysisStyle) => void;
  toggleAnalysisStyle: () => void;
}

const defaultFrom = new Date(new Date().setMonth(new Date().getMonth() - 5))
  .toISOString()
  .slice(0, 10);
const defaultTo = new Date().toISOString().slice(0, 10);

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedTarget: { type: "alias", value: "oraculo-holding" },
  period: { from: defaultFrom, to: defaultTo },
  analysisStyle: "creative",
  setTarget: (selectedTarget) => set({ selectedTarget }),
  setPeriod: (period) => set({ period }),
  setAnalysisStyle: (analysisStyle) => set({ analysisStyle }),
  toggleAnalysisStyle: () =>
    set((state) => ({
      analysisStyle: state.analysisStyle === "creative" ? "technical" : "creative"
    }))
}));
