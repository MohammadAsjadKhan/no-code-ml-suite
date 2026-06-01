import { useState } from 'react';
import { MLClass } from '../App';
import { Edit2, Check, Trash2, Image as ImageIcon, X } from 'lucide-react';

interface ClassManagerProps {
  classes: MLClass[];
  selectedIdx: number | null;
  onSelectClass: (idx: number | null) => void; // Fixed: Allow setting to null on wipe out
  onRefresh: () => void;
  apiBaseUrl: string;
}

export default function ClassManager({ classes, selectedIdx, onSelectClass, onRefresh, apiBaseUrl }: ClassManagerProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [tempName, setTempName] = useState<string>('');

  const startEditing = (idx: number, currentName: string) => {
    setEditingIdx(idx);
    setTempName(currentName);
  };

  const cancelEditing = () => {
    setEditingIdx(null);
    setTempName('');
  };

  const saveName = async (idx: number) => {
    if (!tempName.trim()) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/classes/${idx}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tempName.trim() }) // Trim whitespace before network transmission
      });
      if (res.ok) {
        setEditingIdx(null);
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to update class label:", err);
    }
  };

  const resetClassSlot = async (idx: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting the class when clicking the delete button
    if (!window.confirm("Are you sure you want to completely erase this class and all its uploaded images?")) return;
    
    try {
      const res = await fetch(`${apiBaseUrl}/api/classes/${idx}/reset`, { method: 'POST' });
      if (res.ok) {
        // SEMANTIC FIX: Clear selection context if the active class is wiped out
        if (selectedIdx === idx) {
          onSelectClass(null);
        }
        onRefresh();
      }
    } catch (err) {
      console.error("Failed resetting class index:", err);
    }
  };

  return (
    <div className="space-y-2 flex-1">
      {classes.map((cls) => {
        const isSelected = selectedIdx === cls.class_index;
        const isEditing = editingIdx === cls.class_index;

        return (
          <div
            key={cls.class_index}
            onClick={() => !isEditing && onSelectClass(cls.class_index)}
            className={`p-3 rounded-lg flex items-center justify-between border transition-all cursor-pointer ${
              isSelected 
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md' 
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            {/* LEFT AREA: INDEX, SELECTION STATE, & LABEL STRING */}
            <div className="flex items-center gap-3 flex-1 min-w-0" onClick={(e) => isEditing && e.stopPropagation()}>
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                0{cls.class_index}
              </span>

              {isEditing ? (
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-sm text-white rounded px-2 py-0.5 w-full focus:outline-none focus:border-indigo-500"
                  autoFocus
                  // SEMANTIC FIX: Handle Escape fallback cancels cleanly
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName(cls.class_index);
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  onBlur={() => setTimeout(cancelEditing, 200)} // Allow click events on action buttons to fire first
                />
              ) : (
                <span className="font-medium truncate text-sm">
                  {cls.name}
                </span>
              )}
            </div>

            {/* RIGHT AREA: COUNTER METRICS AND CONTROL ACTIONS */}
            <div className="flex items-center gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
              {cls.is_active && (
                <span className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                  <ImageIcon className="h-3 w-3" />
                  {cls.images.length}
                </span>
              )}

              {isEditing ? (
                <div className="flex items-center gap-1">
                  <button
                    onMouseDown={() => saveName(cls.class_index)} // fires prior to input onBlur event handler
                    className="p-1 hover:bg-slate-800 text-emerald-400 rounded transition-colors"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onMouseDown={cancelEditing}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(cls.class_index, cls.name);
                  }}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}

              {!isEditing && cls.is_active && (
                <button
                  onClick={(e) => resetClassSlot(cls.class_index, e)}
                  className="p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}