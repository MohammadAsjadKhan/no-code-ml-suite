import { useState, useEffect, useRef } from 'react';
import { MLClass } from '../App';
import { Cpu, AlertTriangle, Sparkles, Activity, Sliders, Layers } from 'lucide-react';
import ConfusionMatrix from './ConfusionMatrix';

interface TrainerProps {
  classes: MLClass[];
  onTrainingComplete: () => void;
  apiBaseUrl: string;
}

interface StreamFrame {
  epoch: number;
  total_epochs: number;
  loss: number;
  test_f1_score?: number;
  status: string;
  confusion_matrix?: number[][]; 
  matrix_labels?: number[];      
}

export default function Trainer({ classes, onTrainingComplete, apiBaseUrl }: TrainerProps) {
  const [training, setTraining] = useState<boolean>(false);
  const [currentFrame, setCurrentFrame] = useState<StreamFrame | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // SEMANTIC FIX: Isolate evaluation matrix data into its own persistent state
  const [completedMatrix, setCompletedMatrix] = useState<{
    matrix: number[][];
    labels: number[];
  } | null>(null);

  // --- MODEL ARCHITECTURE SANDBOX COMPONENT STATES ---
  const [depth, setDepth] = useState<number>(3); 
  const [baseChannels, setBaseChannels] = useState<number>(32); 
  const [useBatchNorm, setUseBatchNorm] = useState<boolean>(false); 
  const [dropoutP, setDropoutP] = useState<number>(0.0); 

  // Persistent reference to capture streaming handle context across component unmount boundaries
  const streamRef = useRef<EventSource | null>(null);

  const activeClasses = classes.filter(c => c.images.some(img => img.dataset_type === 'train'));
  const canTrain = activeClasses.length >= 2;

  // SEMANTIC FIX: Component Unmount Safety Guardrail Lifecycle Implementation
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.close();
      }
    };
  }, []);

  const handleLiveTrainStream = () => {
    if (!canTrain) return;

    // Terminate any rogue running handles before initializing a new one
    if (streamRef.current) {
      streamRef.current.close();
    }

    setTraining(true);
    setErrorMsg('');
    setCurrentFrame(null);
    setCompletedMatrix(null); // Reset metrics container safely on a deliberate user click action

    const queryString = `depth=${depth}&base_channels=${baseChannels}&use_batch_norm=${useBatchNorm}&dropout_p=${dropoutP}`;
    const eventSource = new EventSource(`${apiBaseUrl}/api/train/stream?${queryString}`);
    streamRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: StreamFrame = JSON.parse(event.data);
        setCurrentFrame(data);

        if (data.status === 'completed') {
          if (data.confusion_matrix && data.matrix_labels) {
            setCompletedMatrix({
              matrix: data.confusion_matrix,
              labels: data.matrix_labels
            });
          }
          eventSource.close(); 
          streamRef.current = null;
          setTraining(false);
          onTrainingComplete();
        }
      } catch (parseErr) {
        console.error("Payload decoding failure:", parseErr);
      }
    };

    eventSource.onerror = (err) => {
      // SEMANTIC FIX: Only interrupt the training run states if the connection line is definitively dead
      if (eventSource.readyState === EventSource.CLOSED) {
        console.error("Stream tracking severed entirely:", err);
        setErrorMsg("Neural layer communication line disconnected unexpectedly.");
        eventSource.close();
        streamRef.current = null;
        setTraining(false);
      } else {
        console.warn("EventSource encountered transient transport dropouts. Attempting automatic reconnection...");
      }
    };
  };

  const progressPercent = currentFrame 
    ? Math.round((currentFrame.epoch / currentFrame.total_epochs) * 100) 
    : 0;

  return (
    <div className="flex flex-col h-full justify-between space-y-4">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="h-5 w-5 text-indigo-400" />
            <h3 className="text-md font-bold text-white">Neural Optimizer Engine</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed select-none">
            Trains on your custom datasets and isolates testing samples to construct real-time precision metrics tracking loops.
          </p>
        </div>

        {/* --- MODEL CONFIGURATION PANEL INTERFACE --- */}
        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 select-none">
            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
            <span>MODEL ARCHITECTURE SANDBOX</span>
          </div>

          {/* 1. Model Depth Slider (1-5 layers) */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] select-none">
              <span className="text-slate-400 flex items-center gap-1"><Layers className="h-3 w-3" /> Network Depth:</span>
              <span className="text-indigo-400 font-mono font-bold">{depth} Conv Blocks</span>
            </div>
            <input 
              type="range" min="1" max="5" value={depth} 
              disabled={training}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* 2. Hidden Layer Base Channels Breadth Matrix Selection */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 block select-none">Base Feature Channels (Breadth):</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[16, 32, 64].map((channels) => (
                <button
                  key={channels} type="button" disabled={training}
                  onClick={() => setBaseChannels(channels)}
                  className={`py-1 text-xs font-mono font-bold border rounded transition-all ${
                    baseChannels === channels 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' 
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {channels} ch
                </button>
              ))}
            </div>
          </div>

          {/* 3. Regularization Blocks Matrix */}
          <div className="grid grid-cols-2 gap-3 pt-0.5 border-t border-slate-900 mt-2 select-none">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" checked={useBatchNorm} disabled={training}
                onChange={(e) => setUseBatchNorm(e.target.checked)}
                className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0 h-3.5 w-3.5 accent-indigo-500"
              />
              <span className="text-[11px] font-medium text-slate-400">Batch Norm</span>
            </label>

            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Dropout:</span>
                <span>{dropoutP > 0 ? `${Math.round(dropoutP * 100)}%` : 'OFF'}</span>
              </div>
              <input 
                type="range" min="0" max="0.5" step="0.1" value={dropoutP} disabled={training}
                onChange={(e) => setDropoutP(Number(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 h-1 appearance-none cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>
        </div>
      </div>

      {!canTrain && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2.5 text-xs text-amber-400 select-none">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Prerequisites Unfulfilled</span>
            You need to upload at least one image under the <strong>Train Set</strong> tab for 2 or more separate classes.
          </div>
        </div>
      )}

      {/* REALTIME STREAM TRACKING DASHBOARD GRAPH LAYER */}
      {currentFrame && (
        <div className="space-y-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs select-none">
            <span className="text-slate-400 flex items-center gap-1">
              <Activity className={`h-3.5 w-3.5 text-indigo-400 ${training ? 'animate-pulse' : ''}`} />
              Epoch Processing: <strong>{currentFrame.epoch} / {currentFrame.total_epochs}</strong>
            </span>
            <span className="font-mono text-indigo-300 font-bold">{progressPercent}%</span>
          </div>

          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="bg-slate-950 p-2 rounded-lg text-center border border-slate-800/40">
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block select-none">Training Loss</span>
              <span className="text-sm font-mono font-bold text-amber-400">{currentFrame.loss}</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg text-center border border-slate-800/40">
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block select-none">Test Accuracy</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {currentFrame.test_f1_score !== undefined ? `${currentFrame.test_f1_score}%` : 'Calculating...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- SEMANTIC FIX: Confusion Matrix displayed safely from stable isolation state --- */}
      {completedMatrix && (
        <ConfusionMatrix 
          matrix={completedMatrix.matrix} 
          matrixLabels={completedMatrix.labels} 
          classes={classes} 
        />
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-mono">
          CRITICAL: {errorMsg}
        </div>
      )}

      <button
        onClick={handleLiveTrainStream}
        disabled={!canTrain || training}
        className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all select-none ${
          !canTrain ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
          training ? 'bg-indigo-600/30 border border-indigo-500/20 text-indigo-300 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10'
        }`}
      >
        <Sparkles className={`h-4 w-4 ${training ? 'animate-spin' : ''}`} />
        {training ? 'Streaming Live Matrix Data...' : 'Train Model Engine'}
      </button>
    </div>
  );
}