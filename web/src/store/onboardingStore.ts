import { create } from "zustand";
import { api } from "@/lib/api";
import { toast } from "sonner";

type OnboardingStep = "welcome" | "features" | "setup" | "complete";

interface OnboardingFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface OnboardingState {
  // Step state
  step: OnboardingStep;

  // Form state
  formData: OnboardingFormData;
  error: string;
  isSubmitting: boolean;

  // Actions
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  setFormField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void;
  setError: (error: string) => void;
  submitSetup: () => Promise<boolean>;
  reset: () => void;
}

const initialFormData: OnboardingFormData = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  // Initial state
  step: "welcome",
  formData: { ...initialFormData },
  error: "",
  isSubmitting: false,

  setStep: (step) => set({ step }),

  nextStep: () => {
    const { step } = get();
    if (step === "welcome") set({ step: "features" });
    else if (step === "features") set({ step: "setup" });
  },

  setFormField: (field, value) => {
    set((state) => ({
      formData: { ...state.formData, [field]: value },
    }));
  },

  setError: (error) => set({ error }),

  submitSetup: async () => {
    const { formData } = get();
    set({ isSubmitting: true, error: "" });

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      set({ error: "All fields are required", isSubmitting: false });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      set({ error: "Passwords do not match", isSubmitting: false });
      return false;
    }

    if (formData.password.length < 8) {
      set({ error: "Password must be at least 8 characters", isSubmitting: false });
      return false;
    }

    try {
      await api.post("/onboarding/setup", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      toast.success("Admin account created!");
      set({ step: "complete", isSubmitting: false });
      return true;
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to initialize system";
      set({ error: errorMsg, isSubmitting: false });
      toast.error(errorMsg);
      return false;
    }
  },

  reset: () => {
    set({
      step: "welcome",
      formData: { ...initialFormData },
      error: "",
      isSubmitting: false,
    });
  },
}));
