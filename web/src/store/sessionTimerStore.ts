import { create } from "zustand";
import { api } from "@/lib/api";

type TimerState = "idle" | "running" | "paused";

// Module-scoped interval references (not part of Zustand state)
let tickInterval: number | null = null;
let saveInterval: number | null = null;
let pendingSave = false;

interface SessionTimerState {
  // State
  sessionId: number | null;
  elapsedSeconds: number;
  timerState: TimerState;
  plannedDurationMin: number;
  lastSavedSeconds: number;
  isSaving: boolean;

  // Actions
  initialize: (
    sessionId: number,
    elapsedSeconds: number,
    timerState: TimerState,
    plannedDurationMin: number
  ) => void;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  toggle: () => Promise<void>;
  tick: () => void;
  save: () => Promise<void>;
  reset: () => void;
  cleanup: () => void;
}

// Helper to start intervals
const startIntervals = (get: () => SessionTimerState) => {
  // Clear any existing intervals
  if (tickInterval !== null) {
    window.clearInterval(tickInterval);
  }
  if (saveInterval !== null) {
    window.clearInterval(saveInterval);
  }

  // Start tick interval (every second)
  tickInterval = window.setInterval(() => {
    get().tick();
  }, 1000);

  // Start save interval (every 10 seconds)
  saveInterval = window.setInterval(() => {
    get().save();
  }, 10000);
};

// Helper to stop intervals
const stopIntervals = () => {
  if (tickInterval !== null) {
    window.clearInterval(tickInterval);
    tickInterval = null;
  }
  if (saveInterval !== null) {
    window.clearInterval(saveInterval);
    saveInterval = null;
  }
};

export const useSessionTimerStore = create<SessionTimerState>((set, get) => ({
  // Initial state
  sessionId: null,
  elapsedSeconds: 0,
  timerState: "idle",
  plannedDurationMin: 0,
  lastSavedSeconds: 0,
  isSaving: false,

  initialize: (sessionId, elapsedSeconds, timerState, plannedDurationMin) => {
    // Clean up any existing intervals
    stopIntervals();

    set({
      sessionId,
      elapsedSeconds,
      timerState,
      plannedDurationMin,
      lastSavedSeconds: elapsedSeconds,
      isSaving: false,
    });

    // If timer was running, start the intervals
    if (timerState === "running") {
      startIntervals(get);
    }
  },

  start: async () => {
    const { sessionId, elapsedSeconds, timerState } = get();
    if (!sessionId || timerState === "running") return;

    set({ timerState: "running" });
    startIntervals(get);

    // Save to backend
    try {
      await api.put(`/sessions/${sessionId}/timer`, {
        elapsed_time_seconds: elapsedSeconds,
        timer_state: "running",
      });
      set({ lastSavedSeconds: elapsedSeconds });
    } catch (error) {
      console.error("Failed to start session timer:", error);
    }
  },

  pause: async () => {
    const { sessionId, elapsedSeconds, timerState } = get();
    if (!sessionId || timerState !== "running") return;

    stopIntervals();
    set({ timerState: "paused" });

    // Save to backend
    try {
      await api.put(`/sessions/${sessionId}/timer`, {
        elapsed_time_seconds: elapsedSeconds,
        timer_state: "paused",
      });
      set({ lastSavedSeconds: elapsedSeconds });
    } catch (error) {
      console.error("Failed to pause session timer:", error);
    }
  },

  toggle: async () => {
    const { timerState } = get();
    if (timerState === "running") {
      await get().pause();
    } else {
      await get().start();
    }
  },

  tick: () => {
    set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
  },

  save: async () => {
    const { sessionId, elapsedSeconds, timerState, lastSavedSeconds } = get();
    if (!sessionId || pendingSave || elapsedSeconds === lastSavedSeconds) return;

    pendingSave = true;
    set({ isSaving: true });

    try {
      await api.put(`/sessions/${sessionId}/timer`, {
        elapsed_time_seconds: elapsedSeconds,
        timer_state: timerState,
      });
      set({ lastSavedSeconds: elapsedSeconds });
    } catch (error) {
      console.error("Failed to save session timer:", error);
    } finally {
      pendingSave = false;
      set({ isSaving: false });
    }
  },

  reset: () => {
    stopIntervals();
    set({
      sessionId: null,
      elapsedSeconds: 0,
      timerState: "idle",
      plannedDurationMin: 0,
      lastSavedSeconds: 0,
      isSaving: false,
    });
  },

  cleanup: () => {
    stopIntervals();
  },
}));
