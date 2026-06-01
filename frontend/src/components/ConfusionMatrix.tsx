import { useState } from 'react';
import { MLClass } from '../App';
import { Grid, HelpCircle } from 'lucide-react';

interface ConfusionMatrixProps {
  matrix: number[][];
  matrixLabels: number[];
  classes: MLClass[];
}

export default function ConfusionMatrix({ matrix, matrixLabels, classes }: ConfusionMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; val: number } | null>(null);

  const getClassName = (index: number) => {
    const matched = classes.find(c => c.class_index === index);
    return matched ? matched.name : `Class ${index}`;
  };

  const matrixSize = matrixLabels.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Grid className="h-4 w-4 text-indigo-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Interactive Confusion Matrix</h4>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" /> 
            Correct
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-rose-500/20 border border-rose-500/40 inline-block" /> 
            Misclassified
          </span>
        </div>
      </div>

      <div className="relative overflow-x-auto flex flex-col items-center py-2">
        {/* SEMANTIC FIX: Locked row layout explicit scaling bounds alongside columns */}
        <div 
          className="grid gap-1" 
          style={{ 
            gridTemplateColumns: `repeat(${matrixSize}, minmax(45px, 1fr))`,
            gridTemplateRows: `repeat(${matrixSize}, minmax(45px, 1fr))`
          }}
        >
          {matrix.map((row, rowIndex) => 
            row.map((value, colIndex) => {
              // SEMANTIC FIX: Enforce diagonal validation via real dataset keys rather than layout array indexes
              const isCorrectPrediction = matrixLabels[rowIndex] === matrixLabels[colIndex];
              const hasValue = value > 0;
              
              let bgStyle = "bg-slate-950 border-slate-900 text-slate-600";
              if (hasValue) {
                bgStyle = isCorrectPrediction 
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold"
                  : "bg-rose-500/20 border-rose-500/40 text-rose-400 font-bold animate-pulse";
              }

              // SEMANTIC FIX: Tied key identities directly to true model classes to maintain structural stability
              const trueClassId = matrixLabels[rowIndex];
              const predClassId = matrixLabels[colIndex];

              return (
                <div
                  key={`true-${trueClassId}-pred-${predClassId}`}
                  onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex, val: value })}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={`h-11 w-11 flex items-center justify-center text-xs font-mono border rounded-lg transition-all duration-150 cursor-crosshair relative ${bgStyle}`}
                >
                  {value}
                  
                  <span className="absolute top-0.5 left-0.5 text-[7px] opacity-20 text-slate-400 select-none">
                    {trueClassId},{predClassId}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Dynamic Context Readout HUD */}
        <div className="mt-4 w-full bg-slate-950 border border-slate-800/60 p-2.5 rounded-lg text-center h-11 flex items-center justify-center text-xs">
          {hoveredCell ? (
            <p className="text-slate-300">
              True Class <strong className="text-indigo-400">"{getClassName(matrixLabels[hoveredCell.row])}"</strong> was predicted as <strong className="text-violet-400">"{getClassName(matrixLabels[hoveredCell.col])}"</strong> <strong className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded ml-1">{hoveredCell.val} times</strong>
            </p>
          ) : (
            <p className="text-slate-500 flex items-center gap-1 select-none">
              <HelpCircle className="h-3.5 w-3.5 text-slate-600" /> Hover over matrix blocks to diagnose prediction intersections
            </p>
          )}
        </div>
      </div>
    </div>
  );
}