import React from 'react';
import { 
  MousePointer2, 
  Scissors, 
  Wand2, 
  RotateCcw,
  RotateCw,
  Maximize,
  Download,
  PenTool
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ToolbarProps {
  activeTool: 'select' | 'remove' | 'wand' | 'node';
  setActiveTool: (tool: 'select' | 'remove' | 'wand' | 'node') => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  activeTool, 
  setActiveTool, 
  onUndo, 
  onRedo,
  onExport 
}) => {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'remove', icon: Scissors, label: 'Remove Region' },
    { id: 'wand', icon: Wand2, label: 'Magic Wand' },
    { id: 'node', icon: PenTool, label: 'Node Edit' },
  ] as const;

  return (
    <div className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2 justify-between shrink-0">
      <div className="flex items-center gap-1 bg-zinc-800 p-0.5 rounded-lg border border-zinc-700">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={cn(
              "p-1.5 rounded transition-colors flex items-center gap-2 px-3",
              activeTool === tool.id 
                ? "bg-blue-600 text-white shadow-sm" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
            )}
            title={tool.label}
          >
            <tool.icon size={16} />
            <span className="text-[11px] font-medium hidden sm:inline">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 border-r border-zinc-700 pr-4">
          <button onClick={onUndo} className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" title="Undo (Ctrl+Z)">
            <RotateCcw size={16} />
          </button>
          <button onClick={onRedo} className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" title="Redo (Ctrl+Y)">
            <RotateCw size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" title="Fit to Screen">
            <Maximize size={16} />
          </button>
          <button 
            onClick={onExport}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors"
          >
            <Download size={14} />
            Export SVG
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
