import { useEffect, useState, useCallback } from 'react';
import { History, ShieldCheck, ZapOff, RefreshCw } from 'lucide-react';

interface TrainingRun {
  id: number;
  timestamp: string;
  depth: number;
  base_channels: number;
  use_batch_norm: boolean;
  dropout_p: number;
  final_loss: number;
  test_f1_score: number;
}

interface ExperimentTrackerProps {
  apiBaseUrl: string;
  refreshTrigger: boolean;
}

export default function ExperimentTracker({ apiBaseUrl, refreshTrigger }: ExperimentTrackerProps) {
  const [runs, setRuns] = useState<TrainingRun[]>([]);
  const [localLoading, setLocalLoading] = useState<boolean>(false);

  // SEMANTIC FIX: Stabilized tracking log fetch routine via useCallback for re-usability 
  const loadLogs = useCallback((signal?: AbortSignal) => {
    setLocalLoading(true);
    
    // SEMANTIC FIX: Appended a dynamic timestamp string to force cache busting
    const cacheBusterUrl = `${apiBaseUrl}/api/runs?_t=${Date.now()}`;
  
    fetch(cacheBusterUrl, { signal })
      .then(res => res.json())
      .then(data => setRuns(data))
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Could not fetch historical training runs:", err);
        }
      })
      .finally(() => {
        setLocalLoading(false);
      });
  }, [apiBaseUrl]);

  // Synchronize component when parent flags dynamic metrics shifts (e.g., training completions, asset resets)
  useEffect(() => {
    const controller = new AbortController();
    loadLogs(controller.signal);
    return () => controller.abort();
  }, [loadLogs, refreshTrigger]);

  const parseAndLocalizeTime = (utcString: string) => {
    const standardizedString = utcString.endsWith('Z') ? utcString : `${utcString}Z`;
    const dateObj = new Date(standardizedString);
    
    if (isNaN(dateObj.getTime())) return utcString;

    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      {/* HEADER CONTROL CONTAINER */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 select-none">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Experiment Tracking Log</h4>
        </div>
        
        {/* SEMANTIC FIX: Added a manual workspace sync mechanism to bypass browser cache holds */}
        <button 
          onClick={() => loadLogs()}
          disabled={localLoading}
          className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200 disabled:opacity-40"
          title="Force Sync Logging System"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${localLoading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500 select-none">
          No experiments recorded yet. Train a configuration to register your first active tracking run entry!
        </div>
      ) : (
        <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-950 rounded-lg">
          <table className="w-full text-left text-xs text-slate-400 border-collapse">
            <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-mono tracking-wider sticky top-0 z-10 select-none">
              <tr>
                <th className="p-2 border-b border-slate-800">Time</th>
                <th className="p-2 border-b border-slate-800">Depth</th>
                <th className="p-2 border-b border-slate-800">Breadth</th>
                <th className="p-2 border-b border-slate-800">BN</th>
                <th className="p-2 border-b border-slate-800">Dropout</th>
                <th className="p-2 border-b border-slate-800 text-amber-500">Loss</th>
                <th className="p-2 border-b border-slate-800 text-emerald-500">Accuracy / F1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-950 bg-slate-900/40">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-950/40 transition-colors">
                  <td className="p-2 font-mono text-[11px] whitespace-nowrap">
                    {parseAndLocalizeTime(run.timestamp)}
                  </td>
                  <td className="p-2 font-medium text-slate-300">{run.depth} layers</td>
                  <td className="p-2 font-mono text-indigo-300">{run.base_channels} ch</td>
                  <td className="p-2">
                    {run.use_batch_norm ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-500 inline" />
                    ) : (
                      <ZapOff className="h-3.5 w-3.5 text-slate-600 inline" />
                    )}
                  </td>
                  <td className="p-2 font-mono">{run.dropout_p > 0 ? `${Math.round(run.dropout_p * 100)}%` : '0%'}</td>
                  <td className="p-2 font-mono font-bold text-amber-500/90">
                    {typeof run.final_loss === 'number' ? run.final_loss.toFixed(4) : run.final_loss}
                  </td>
                  <td className="p-2 font-mono font-bold text-emerald-400">
                    {typeof run.test_f1_score === 'number' ? `${run.test_f1_score.toFixed(1)}%` : `${run.test_f1_score}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}