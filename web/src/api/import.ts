import { api } from "@/lib/api";

// ============= Types =============

export interface BundledDataset {
  id: string;
  name: string;
  description: string;
  file_name: string;
  problem_count: number;
  pattern_count: number;
  difficulties: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface InvalidRow {
  row_number: number;
  error: string;
  title?: string;
}

export interface ParseResult {
  total_rows: number;
  valid_rows: number;
  invalid_rows: InvalidRow[];
  patterns_to_create: string[];
  existing_patterns: string[];
  duplicate_count: number;
  difficulties: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface RecentItem {
  title: string;
  difficulty: string;
  status: "created" | "skipped" | "error";
}

export interface ImportProgress {
  phase: "patterns" | "problems" | "complete" | "error";
  current_item: string;
  current_index: number;
  total_items: number;
  problems_created: number;
  patterns_created: number;
  duplicates_skipped: number;
  percentage: number;
  error?: string;
  recent_items?: RecentItem[];
}

export interface ImportResult {
  success: boolean;
  problems_created: number;
  patterns_created: number;
  duplicates_skipped: number;
  errors?: {
    row_number: number;
    title: string;
    error: string;
  }[];
  duration: string;
}

// ============= API Functions =============

export const importApi = {
  // Get list of bundled datasets
  getBundledDatasets: async (): Promise<BundledDataset[]> => {
    const response = await api.get("/admin/data/import/datasets");
    return response.data.data;
  },

  // Parse a bundled dataset (returns analysis without importing)
  parseBundledDataset: async (datasetId: string): Promise<ParseResult> => {
    const response = await api.post("/admin/data/import/parse", {
      use_bundled: true,
      dataset_id: datasetId,
    });
    return response.data.data;
  },

  // Parse an uploaded CSV file
  parseUploadedCSV: async (file: File): Promise<ParseResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/admin/data/import/parse-upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  },

  // Execute import from bundled dataset (returns EventSource URL)
  getExecuteImportURL: (datasetId: string): string => {
    return `/api/v1/admin/data/import/execute?use_bundled=true&dataset_id=${encodeURIComponent(datasetId)}`;
  },

  // Execute import from uploaded file (not SSE, uses FormData POST)
  getExecuteUploadURL: (): string => {
    return `/api/v1/admin/data/import/execute-upload`;
  },
};

// ============= Onboarding Import APIs (no auth required) =============

export const onboardingImportApi = {
  // Get bundled datasets during onboarding
  getBundledDatasets: async (): Promise<BundledDataset[]> => {
    const response = await api.get("/onboarding/import/datasets");
    return response.data.data;
  },

  // Parse bundled dataset during onboarding
  parseBundledDataset: async (datasetId: string): Promise<ParseResult> => {
    const response = await api.post("/onboarding/import/parse", {
      use_bundled: true,
      dataset_id: datasetId,
    });
    return response.data.data;
  },

  // Get execute import URL for onboarding
  getExecuteImportURL: (datasetId: string): string => {
    return `/api/v1/onboarding/import/execute?use_bundled=true&dataset_id=${encodeURIComponent(datasetId)}`;
  },
};

// ============= SSE Helper =============

export interface SSECallbacks {
  onConnected?: () => void;
  onProgress?: (progress: ImportProgress) => void;
  onComplete?: (result: ImportResult) => void;
  onError?: (error: string) => void;
}

/**
 * Connect to an SSE import stream and handle events
 */
export function connectToImportStream(url: string, callbacks: SSECallbacks): EventSource {
  const eventSource = new EventSource(url, { withCredentials: true });

  eventSource.addEventListener("connected", () => {
    callbacks.onConnected?.();
  });

  eventSource.addEventListener("progress", (event) => {
    try {
      const progress: ImportProgress = JSON.parse(event.data);
      callbacks.onProgress?.(progress);
    } catch (e) {
      console.error("Failed to parse progress event:", e);
    }
  });

  eventSource.addEventListener("complete", (event) => {
    try {
      const result: ImportResult = JSON.parse(event.data);
      callbacks.onComplete?.(result);
      eventSource.close();
    } catch (e) {
      console.error("Failed to parse complete event:", e);
    }
  });

  eventSource.addEventListener("error", (event) => {
    // Check if it's a custom error event from the server
    if (event instanceof MessageEvent && event.data) {
      try {
        const data = JSON.parse(event.data);
        callbacks.onError?.(data.error || "Import failed");
      } catch {
        callbacks.onError?.("Connection error");
      }
    } else {
      callbacks.onError?.("Connection lost");
    }
    eventSource.close();
  });

  // Handle connection errors
  eventSource.onerror = () => {
    // Only call onError if we haven't already received a complete event
    if (eventSource.readyState === EventSource.CLOSED) {
      return;
    }
    callbacks.onError?.("Connection lost");
    eventSource.close();
  };

  return eventSource;
}
