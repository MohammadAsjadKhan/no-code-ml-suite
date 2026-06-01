import { useState } from 'react';
import { MLClass } from '../App';
import { Upload, GraduationCap, ShieldCheck } from 'lucide-react';

interface ImageUploaderProps {
  activeClass: MLClass;
  onRefresh: () => void;
  apiBaseUrl: string;
}

export default function ImageUploader({ activeClass, onRefresh, apiBaseUrl }: ImageUploaderProps) {
  const [uploading, setUploading] = useState<boolean>(false);
  const [datasetType, setDatasetType] = useState<'train' | 'test'>('train');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const selectedFiles = Array.from(e.target.files);
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));

    setUploading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/classes/${activeClass.class_index}/upload?dataset_type=${datasetType}`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error("Batch uploading process failure:", err);
    } finally {
      setUploading(false);
      // SEMANTIC FIX: Wipe the input value cache clean so users can re-upload identical file matrices back-to-back
      e.target.value = '';
    }
  };

  const filteredImages = activeClass.images.filter(img => img.dataset_type === datasetType);

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Workspace: <span className="text-indigo-400">"{activeClass.name}"</span></h3>
          <p className="text-xs text-slate-400">Manage data matrices splits standard layout</p>
        </div>

        {/* TRAIN / TEST SPLIT SELECTOR BUTTONS */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 select-none">
          <button
            onClick={() => setDatasetType('train')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
              datasetType === 'train' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Train Set ({activeClass.images.filter(i => i.dataset_type === 'train').length})
          </button>
          <button
            onClick={() => setDatasetType('test')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
              datasetType === 'test' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Test Set ({activeClass.images.filter(i => i.dataset_type === 'test').length})
          </button>
        </div>
      </div>

      {/* FILTERED VIEW WINDOW */}
      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[160px] overflow-y-auto p-1 bg-slate-900/50 rounded-lg">
          {filteredImages.map((img) => {
            const normalizedPath = img.file_path.replace(/\\/g, '/');
            const staticSubPath = normalizedPath.split('/data/uploads/')[1] || normalizedPath.split('uploads/')[1];
            
            // SEMANTIC FIX: Encode the static path fragments cleanly to allow handling special layout characters securely
            const cleanSubPath = staticSubPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
            const imageUrl = `${apiBaseUrl}/static/${cleanSubPath}`;

            return (
              <div key={img.id} className="relative aspect-square bg-slate-900 rounded-md overflow-hidden border border-slate-800 group">
                <img 
                  src={imageUrl} 
                  alt="Dataset point" 
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/100x100/1e293b/64748b?text=Img";
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 border border-dashed border-slate-800 rounded-lg text-xs text-slate-500 select-none">
          No items uploaded inside this target split selection.
        </div>
      )}

      {/* MULTI-UPLOAD BATCH TRIGGER */}
      <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all select-none ${
        uploading ? 'border-indigo-500 bg-indigo-500/5 pointer-events-none' : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/60'
      }`}>
        <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
        <Upload className={`h-6 w-6 mb-2 ${uploading ? 'text-indigo-400 animate-bounce' : 'text-slate-500'}`} />
        <span className="text-xs font-medium text-slate-300">
          {uploading ? 'Streaming files...' : `Upload to ${datasetType === 'train' ? 'Training Matrix' : 'Testing Matrix'}`}
        </span>
      </label>
    </div>
  );
}