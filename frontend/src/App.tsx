import { useState, useEffect, useCallback } from 'react';
import ClassManager from './components/ClassManager';
import ImageUploader from './components/ImageUploader';
import Trainer from './components/Trainer';
import Predictor from './components/Predictor';
import ExperimentTracker from './components/ExperimentTracker';
import { BrainCircuit, Layers } from 'lucide-react';

export interface ClassImage {
  id: number;
  file_path: string;
  ml_class_id: number;
  dataset_type: string; 
}

export interface MLClass {
  id: number;
  class_index: number;
  name: string;
  is_active: boolean;
  images: ClassImage[];
}

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function App() {
  const [classes, setClasses] = useState<MLClass[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isTrained, setIsTrained] = useState<boolean>(false);
  const [runRefreshTrigger, setRunRefreshTrigger] = useState<boolean>(false);

  // Memoized class data fetch routine
  const fetchClasses = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/classes`, { signal });
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Error communicating with FastAPI backend:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Application initialization lifecycles
  useEffect(() => {
    const controller = new AbortController();
    fetchClasses(controller.signal);
    return () => controller.abort();
  }, [fetchClasses]);

  // SEMANTIC FIX: Intercept structural mutations to drop obsolete weights AND alert the log monitor
  const handleDatasetMutationRefresh = useCallback(() => {
    setIsTrained(false); // Invalidate the existing model configuration layout safety flags
    fetchClasses();
    setRunRefreshTrigger(prev => !prev); // 👈 Pings the ExperimentTracker to synchronize its table rows
  }, [fetchClasses]);

  const currentClass = selectedIdx !== null ? classes.find(c => c.class_index === selectedIdx) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white select-none">
        <p className="text-xl animate-pulse">Initializing No-Code ML Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* HEADER NAVBAR */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-8 w-8 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">No-Code Vision Suite</h1>
            <p className="text-xs text-slate-400">Dynamic CNN Classifier Studio (Max 10 Classes)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full text-xs transition-colors duration-300">
          <span className={`h-2.5 w-2.5 rounded-full ${isTrained ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
          <span className="text-slate-300 font-medium">{isTrained ? 'Model Engine Ready' : 'Model Untrained'}</span>
        </div>
      </header>

      {/* CORE FRAMEWORK GRID */}
      <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* LEFT COLUMN: CLASS SLOTS CONTROLLER */}
        <section className="xl:col-span-4 bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col h-[calc(100vh-140px)] overflow-y-auto">
          <div className="flex items-center gap-2 mb-4 select-none">
            <Layers className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Class Allocations</h2>
          </div>
          <ClassManager 
            classes={classes} 
            selectedIdx={selectedIdx} 
            onSelectClass={setSelectedIdx} 
            onRefresh={handleDatasetMutationRefresh} // Triggered on class name wipes/resets
            apiBaseUrl={API_BASE_URL}
          />
        </section>

        {/* RIGHT COLUMN: DETAILED CONTROL ROOM */}
        <section className="xl:col-span-8 flex flex-col gap-6 h-[calc(100vh-140px)] overflow-y-auto">
          {/* TOP PART: IMAGE UPLOADER */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 min-h-[300px]">
            {currentClass ? (
              <ImageUploader 
                activeClass={currentClass} 
                onRefresh={handleDatasetMutationRefresh} // Triggered on file uploads/batch modifications
                apiBaseUrl={API_BASE_URL}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 border-2 border-dashed border-slate-800 rounded-lg p-8 select-none">
                <p className="text-center font-medium">No Class Selected</p>
                <p className="text-sm text-center max-w-xs mt-1">
                  Select any of the 10 placeholders on the left panel to modify its name and upload training samples.
                </p>
              </div>
            )}
          </div>

          {/* MIDDLE PART: EXPERIMENT LOG MONITOR */}
          <ExperimentTracker 
            apiBaseUrl={API_BASE_URL} 
            refreshTrigger={runRefreshTrigger} 
          />

          {/* BOTTOM PART: TRAINER & PREDICTOR SPLIT PANELS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
              <Trainer 
                classes={classes} 
                apiBaseUrl={API_BASE_URL}
                onTrainingComplete={() => {
                  setIsTrained(true); 
                  fetchClasses();
                  setRunRefreshTrigger(prev => !prev); // Sync logs on training completions
                }}
              />
            </div>
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
              <Predictor 
                isTrained={isTrained}
                apiBaseUrl={API_BASE_URL}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}