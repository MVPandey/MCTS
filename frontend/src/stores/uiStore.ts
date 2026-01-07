import { create } from 'zustand';
import type { Model } from '@/types';

interface UIState {
  // Panel visibility
  advancedParamsVisible: boolean;
  modelSettingsVisible: boolean;
  researchReportExpanded: boolean;

  // Selections
  selectedBranchId: string | null;
  hoveredNodeId: string | null;

  // Available models (from API)
  availableModels: Model[];
  defaultModel: string | null;
  modelsLoading: boolean;
  modelsError: string | null;

  // Actions
  toggleAdvancedParams: () => void;
  toggleModelSettings: () => void;
  toggleResearchReport: () => void;
  setSelectedBranch: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setModels: (models: Model[], defaultModel: string | null) => void;
  setModelsLoading: (loading: boolean) => void;
  setModelsError: (error: string | null) => void;
  reset: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  advancedParamsVisible: false,
  modelSettingsVisible: false,
  researchReportExpanded: false,
  selectedBranchId: null,
  hoveredNodeId: null,
  availableModels: [],
  defaultModel: null,
  modelsLoading: false,
  modelsError: null,

  toggleAdvancedParams: () =>
    set((state) => ({ advancedParamsVisible: !state.advancedParamsVisible })),

  toggleModelSettings: () =>
    set((state) => ({ modelSettingsVisible: !state.modelSettingsVisible })),

  toggleResearchReport: () =>
    set((state) => ({ researchReportExpanded: !state.researchReportExpanded })),

  setSelectedBranch: (selectedBranchId) => set({ selectedBranchId }),

  setHoveredNode: (hoveredNodeId) => set({ hoveredNodeId }),

  setModels: (availableModels, defaultModel) =>
    set({ availableModels, defaultModel, modelsLoading: false, modelsError: null }),

  setModelsLoading: (modelsLoading) => set({ modelsLoading }),

  setModelsError: (modelsError) => set({ modelsError, modelsLoading: false }),

  reset: () =>
    set({
      advancedParamsVisible: false,
      modelSettingsVisible: false,
      researchReportExpanded: false,
      selectedBranchId: null,
      hoveredNodeId: null,
    }),
}));
