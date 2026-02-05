import { create } from "zustand";
import { api } from "@/lib/api";
import type { InProgressAttempt } from "@/types";

export type TimerState = "idle" | "running" | "paused";
export type TimerPhase = "loading" | "prompt" | "running" | "paused" | "completing";

interface AttemptTimerState {
  // Core state
  attemptId: string | null;
  attempt: InProgressAttempt | null;
  elapsedSeconds: number;
  timerState: TimerState;
  lastSavedSeconds: number;
  isSaving: boolean;
  lastSaveTime: Date | null;
  error: string | null;
  phase: TimerPhase;

  // Resume dialog state
  showResumeDialog: boolean;
  existingAttempt: InProgressAttempt | null;

  // Completion form state
  isSubmitting: boolean;
  formData: {
    confidence_score: number;
    outcome: "passed" | "failed";
    notes: string;
    duration_minutes: number;
    duration_seconds: number;
  };

  // Actions
  initialize: (problemId: string, sessionId?: string) => Promise<void>;
  initializeFromAttempt: (attempt: InProgressAttempt) => void;
  startNewAttempt: (problemId: string, sessionId?: string) => Promise<void>;
  resumeAttempt: () => void;
  startFresh: (problemId: string, sessionId?: string) => Promise<void>;
  toggleTimer: () => Promise<void>;
  tick: () => void;
  save: () => Promise<void>;
  handleCompleteClick: () => Promise<void>;
  handleBackToTimer: () => void;
  handleAbandon: () => Promise<void>;
  submitCompletion: () => Promise<boolean>;
  setFormData: (data: Partial<AttemptTimerState["formData"]>) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  cleanup: () => void;
}

// Module-scoped interval references (not part of Zustand state)
let tickInterval: number | null = null;
let saveInterval: number | null = null;
let pendingSave = false;

// Helper to start intervals
const startIntervals = (get: () => AttemptTimerState) => {
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

// Helper to save timer state to backend
const saveTimerState = async (
  attemptId: string,
  elapsed: number,
  state: TimerState,
  set: (partial: Partial<AttemptTimerState>) => void
): Promise<void> => {
  if (pendingSave) return;

  try {
    pendingSave = true;
    set({ isSaving: true });
    await api.put(`/attempts/${attemptId}/timer`, {
      elapsed_time_seconds: elapsed,
      timer_state: state,
    });
    set({ lastSavedSeconds: elapsed, lastSaveTime: new Date() });
  } catch (err) {
    console.error("Failed to save timer state:", err);
  } finally {
    pendingSave = false;
    set({ isSaving: false });
  }
};

const initialFormData = {
  confidence_score: 50,
  outcome: "passed" as const,
  notes: "",
  duration_minutes: 0,
  duration_seconds: 0,
};

export const useAttemptTimerStore = create<AttemptTimerState>((set, get) => ({
  // Initial state
  attemptId: null,
  attempt: null,
  elapsedSeconds: 0,
  timerState: "idle",
  lastSavedSeconds: 0,
  isSaving: false,
  lastSaveTime: null,
  error: null,
  phase: "loading",
  showResumeDialog: false,
  existingAttempt: null,
  isSubmitting: false,
  formData: { ...initialFormData },

  initialize: async (problemId: string, sessionId?: string) => {
    set({ phase: "loading", error: null });

    try {
      // Check for existing in-progress attempt
      const response = await api.get(
        `/attempts/in-progress?problem_id=${problemId}`
      );
      const existing = response.data.data;

      if (existing) {
        set({
          existingAttempt: existing,
          showResumeDialog: true,
          phase: "prompt",
        });
      } else {
        await get().startNewAttempt(problemId, sessionId);
      }
    } catch (err) {
      console.error("Failed to initialize:", err);
      set({ error: "Failed to check for existing attempt", phase: "loading" });
    }
  },

  initializeFromAttempt: (attempt: InProgressAttempt) => {
    stopIntervals();
    const phase = attempt.timer_state === "running" ? "running" : "paused";
    set({
      attemptId: attempt.id,
      attempt,
      elapsedSeconds: attempt.elapsed_time_seconds || 0,
      lastSavedSeconds: attempt.elapsed_time_seconds || 0,
      timerState: attempt.timer_state || "idle",
      phase,
      error: null,
    });

    if (phase === "running") {
      startIntervals(get);
    }
  },

  startNewAttempt: async (problemId: string, sessionId?: string) => {
    try {
      const response = await api.post("/attempts/start", {
        problem_id: problemId,
        session_id: sessionId,
      });
      const newAttempt = response.data.data;
      set({
        attemptId: newAttempt.id,
        attempt: newAttempt,
        elapsedSeconds: newAttempt.elapsed_time_seconds || 0,
        lastSavedSeconds: newAttempt.elapsed_time_seconds || 0,
        timerState: "running",
        phase: "running",
        error: null,
      });
      startIntervals(get);
    } catch (err) {
      console.error("Failed to start attempt:", err);
      set({ error: "Failed to start attempt" });
    }
  },

  resumeAttempt: () => {
    const { existingAttempt } = get();
    if (existingAttempt) {
      const phase =
        existingAttempt.timer_state === "running" ? "running" : "paused";
      set({
        attemptId: existingAttempt.id,
        attempt: existingAttempt,
        elapsedSeconds: existingAttempt.elapsed_time_seconds || 0,
        lastSavedSeconds: existingAttempt.elapsed_time_seconds || 0,
        timerState: existingAttempt.timer_state || "idle",
        showResumeDialog: false,
        phase,
      });

      if (phase === "running") {
        startIntervals(get);
      }
    }
  },

  startFresh: async (problemId: string, sessionId?: string) => {
    const { existingAttempt } = get();
    if (existingAttempt) {
      try {
        await api.delete(`/attempts/${existingAttempt.id}`);
        set({ showResumeDialog: false, existingAttempt: null });
        await get().startNewAttempt(problemId, sessionId);
      } catch (err) {
        console.error("Failed to abandon existing attempt:", err);
        set({ error: "Failed to start fresh attempt" });
      }
    }
  },

  toggleTimer: async () => {
    const { attemptId, elapsedSeconds, phase } = get();
    if (!attemptId) return;

    const newPhase = phase === "running" ? "paused" : "running";
    const newTimerState: TimerState = newPhase === "running" ? "running" : "paused";

    if (newPhase === "running") {
      set({ phase: "running", timerState: "running" });
      startIntervals(get);
    } else {
      stopIntervals();
      set({ phase: "paused", timerState: "paused" });
    }

    await saveTimerState(attemptId, elapsedSeconds, newTimerState, set);
  },

  tick: () => {
    set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
  },

  save: async () => {
    const { attemptId, elapsedSeconds, timerState, lastSavedSeconds } = get();
    if (!attemptId || pendingSave || elapsedSeconds === lastSavedSeconds) return;

    await saveTimerState(attemptId, elapsedSeconds, timerState, set);
  },

  handleCompleteClick: async () => {
    const { attemptId, elapsedSeconds } = get();
    if (!attemptId) return;

    stopIntervals();
    set({ phase: "paused", timerState: "paused" });
    await saveTimerState(attemptId, elapsedSeconds, "paused", set);

    // Initialize form with elapsed time
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    set({
      phase: "completing",
      formData: {
        ...get().formData,
        duration_minutes: minutes,
        duration_seconds: seconds,
      },
    });
  },

  handleBackToTimer: () => {
    set({ phase: "paused" });
  },

  handleAbandon: async () => {
    const { attemptId } = get();
    if (!attemptId) return;

    try {
      stopIntervals();
      await api.delete(`/attempts/${attemptId}`);
      get().reset();
    } catch (err) {
      console.error("Failed to abandon attempt:", err);
      set({ error: "Failed to abandon attempt" });
    }
  },

  submitCompletion: async () => {
    const { attemptId, formData } = get();
    if (!attemptId) return false;

    set({ isSubmitting: true, error: null });

    try {
      const totalDurationSeconds =
        formData.duration_minutes * 60 + formData.duration_seconds;

      await api.put(`/attempts/${attemptId}/complete`, {
        confidence_score: formData.confidence_score,
        outcome: formData.outcome,
        notes: formData.notes || undefined,
        duration_seconds: totalDurationSeconds,
      });

      get().reset();
      return true;
    } catch (err) {
      console.error("Failed to complete attempt:", err);
      set({ error: "Failed to complete attempt" });
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  setFormData: (data) => {
    set((state) => ({
      formData: { ...state.formData, ...data },
    }));
  },

  setError: (error) => {
    set({ error });
  },

  reset: () => {
    stopIntervals();
    set({
      attemptId: null,
      attempt: null,
      elapsedSeconds: 0,
      timerState: "idle",
      lastSavedSeconds: 0,
      isSaving: false,
      lastSaveTime: null,
      error: null,
      phase: "loading",
      showResumeDialog: false,
      existingAttempt: null,
      isSubmitting: false,
      formData: { ...initialFormData },
    });
  },

  cleanup: () => {
    stopIntervals();
  },
}));

// Setup visibility change and beforeunload handlers
if (typeof window !== "undefined") {
  // Sync on visibility change
  document.addEventListener("visibilitychange", () => {
    const state = useAttemptTimerStore.getState();
    if (
      state.attemptId &&
      state.elapsedSeconds !== state.lastSavedSeconds &&
      !pendingSave
    ) {
      saveTimerState(
        state.attemptId,
        state.elapsedSeconds,
        state.timerState,
        useAttemptTimerStore.setState
      );
    }
  });

  // Sync on beforeunload
  window.addEventListener("beforeunload", () => {
    const state = useAttemptTimerStore.getState();
    if (
      state.attemptId &&
      state.elapsedSeconds !== state.lastSavedSeconds &&
      !pendingSave
    ) {
      // Use sendBeacon for reliable save on page unload
      const data = JSON.stringify({
        elapsed_time_seconds: state.elapsedSeconds,
        timer_state: state.timerState,
      });
      navigator.sendBeacon(
        `/api/attempts/${state.attemptId}/timer`,
        new Blob([data], { type: "application/json" })
      );
    }
  });
}
