import { useState, useEffect } from 'react';
import { Sparkles, UploadCloud } from 'lucide-react';

interface PredictorProps {
  isTrained: boolean;
  apiBaseUrl: string;
}

interface PredictionResult {
  predicted_class_index: number;
  predicted_class_name: string;
  confidence: number;
}

export default function Predictor({ isTrained, apiBaseUrl }: PredictorProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [running, setRunning] = useState<boolean>(false);

  // SEMANTIC FIX: Flush stale inference predictions and clean memory allocations if the model training state changes
  useEffect(() => {
    if (!isTrained) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setResult(null);
    }
  }, [isTrained]);

  const handlePredictionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    
    // SEMANTIC FIX: Revoke the older object URL before creating a new one to prevent memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setRunning(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${apiBaseUrl}/api/predict`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        alert(data.detail || "Inference error occurred.");
      }
    } catch (err) {
      console.error("Prediction network runtime fault:", err);
    } finally {
      setRunning(false);
      // SEMANTIC FIX: Clear the target string cache so users can evaluate identical file names sequentially
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full justify-between space-y-4">
      {/* CARD TOP META */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <h3 className="text-md font-bold text-white">Inference Engine Matrix</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed select-none">
          Upload a brand-new image here to test your trained model. The network will evaluate the pixels and return the matching class.
        </p>
      </div>

      {/* CORE WORKSPACE SCREEN LAYER */}
      <div className="flex-1 flex flex-col justify-center">
        {!isTrained ? (
          <div className="p-6 border border-slate-800 bg-slate-900/20 text-slate-500 rounded-xl text-center text-xs select-none">
            Inference engine locked. Finish training your model to enable predictions.
          </div>
        ) : (
          <div className="space-y-4">
            {/* INTERACTIVE PREVIEW & REPORT FRAME */}
            {previewUrl && (
              <div className="flex items-center gap-4 p-3 bg-slate-900 border border-slate-800 rounded-lg animate-in fade-in duration-200">
                <img 
                  src={previewUrl} 
                  alt="Prediction Target" 
                  className="w-16 h-16 object-cover rounded-md border border-slate-700 bg-slate-950" 
                />
                
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-mono font-bold block mb-0.5 select-none">
                    {running ? 'Computing Weights...' : 'Prediction Analysis'}
                  </span>
                  {running ? (
                    <div className="h-4 w-24 bg-slate-800 animate-pulse rounded mt-1" />
                  ) : result ? (
                    <div className="animate-in slide-in-from-left-1 duration-200">
                      <h4 className="text-sm font-bold text-white truncate">
                        Match: <span className="text-emerald-400 font-mono">"{result.predicted_class_name}"</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Confidence level: <strong className="text-slate-200">{result.confidence}%</strong>
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* ACTION UPLOAD FIELD */}
            <label className={`flex items-center justify-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm py-2 px-4 rounded-lg cursor-pointer transition-all select-none ${
              running ? 'opacity-50 pointer-events-none' : ''
            }`}>
              <UploadCloud className="h-4 w-4" />
              <span>{running ? 'Running Analysis...' : 'Upload Test Image'}</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePredictionUpload} 
                className="hidden" 
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}