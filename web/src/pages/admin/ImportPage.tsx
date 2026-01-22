import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Database, AlertCircle, Terminal } from "lucide-react";
import { ImportWizard } from "@/components/import/ImportWizard";
import { importApi, type BundledDataset } from "@/api/import";

export default function ImportPage() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<BundledDataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bundled datasets on mount
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const data = await importApi.getBundledDatasets();
        setDatasets(data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load datasets");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, []);

  const handleParseBundled = async (datasetId: string) => {
    return importApi.parseBundledDataset(datasetId);
  };

  const handleComplete = () => {
    // Stay on page - user can import more if needed
  };

  const handleViewProblems = () => {
    navigate("/dashboard/problems");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <Terminal className="relative h-6 w-6 text-primary animate-pulse" />
            </div>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Loading datasets...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-mono text-sm font-semibold text-red-500 uppercase tracking-wider">
              Connection Failed
            </h3>
            <p className="text-xs text-muted-foreground font-mono mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-muted/30 border border-border rounded-lg p-6 text-center">
          <Database className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-mono text-sm font-semibold uppercase tracking-wider">
            No Datasets Available
          </h3>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            No bundled datasets found. Check DATASET_PATH configuration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <ImportWizard
        datasets={datasets}
        isLoadingDatasets={isLoading}
        onParseBundled={handleParseBundled}
        getExecuteUrl={importApi.getExecuteImportURL}
        onComplete={handleComplete}
        onViewProblems={handleViewProblems}
        showCustomUpload={true}
      />
    </div>
  );
}
