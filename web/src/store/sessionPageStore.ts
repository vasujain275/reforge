import { create } from "zustand";

type ViewMode = "list" | "focus";

interface SessionPageState {
  // UI State
  viewMode: ViewMode;
  activeTimerProblemId: string | null;
  showCompleteDialog: boolean;
  showDeleteDialog: boolean;
  isCompletingSession: boolean;
  isDeletingSession: boolean;
  isReordering: boolean;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setActiveTimerProblemId: (id: string | null) => void;
  setShowCompleteDialog: (show: boolean) => void;
  setShowDeleteDialog: (show: boolean) => void;
  setIsCompletingSession: (isCompleting: boolean) => void;
  setIsDeletingSession: (isDeleting: boolean) => void;
  setIsReordering: (isReordering: boolean) => void;

  // Convenience actions
  startTimer: (problemId: string) => void;
  cancelTimer: () => void;
  openCompleteDialog: () => void;
  closeCompleteDialog: () => void;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  enterFocusMode: () => void;
  exitFocusMode: () => void;
  reset: () => void;
}

const initialState = {
  viewMode: "list" as ViewMode,
  activeTimerProblemId: null,
  showCompleteDialog: false,
  showDeleteDialog: false,
  isCompletingSession: false,
  isDeletingSession: false,
  isReordering: false,
};

export const useSessionPageStore = create<SessionPageState>((set) => ({
  ...initialState,

  // Basic setters
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveTimerProblemId: (id) => set({ activeTimerProblemId: id }),
  setShowCompleteDialog: (show) => set({ showCompleteDialog: show }),
  setShowDeleteDialog: (show) => set({ showDeleteDialog: show }),
  setIsCompletingSession: (isCompleting) => set({ isCompletingSession: isCompleting }),
  setIsDeletingSession: (isDeleting) => set({ isDeletingSession: isDeleting }),
  setIsReordering: (isReordering) => set({ isReordering: isReordering }),

  // Convenience actions
  startTimer: (problemId) => set({ activeTimerProblemId: problemId }),
  cancelTimer: () => set({ activeTimerProblemId: null }),
  openCompleteDialog: () => set({ showCompleteDialog: true }),
  closeCompleteDialog: () => set({ showCompleteDialog: false }),
  openDeleteDialog: () => set({ showDeleteDialog: true }),
  closeDeleteDialog: () => set({ showDeleteDialog: false }),
  enterFocusMode: () => set({ viewMode: "focus" }),
  exitFocusMode: () => set({ viewMode: "list" }),

  // Reset to initial state (e.g., when leaving the page)
  reset: () => set(initialState),
}));
