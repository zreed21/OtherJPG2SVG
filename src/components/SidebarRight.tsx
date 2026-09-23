import React from 'react';
import { 
  Zap, 
  Settings2, 
  Maximize2, 
  Download,
  Info,
  Layers
} from 'lucide-react';
import { AppSettings, VectorizationMode } from '../App';

interface SidebarRightProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onVectorize: () => void;
  onExport: () => void;
  onAutoClean: () => void;
  isProcessing: boolean;
}

const SidebarRight: React.FC<SidebarRightProps> = ({ 
  settings, 
  setSettings, 
  onVectorize,
  onExport,
  onAutoClean,
  isProcessing 
}) => {
  const handleChange = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const modes: { value: VectorizationMode; label: string }[] = [
    { value: 'silhouette', label: 'Silhouette' },
    { value: 'outline', label: 'Outline' },
    { value: 'multiple', label: 'Multiple Shapes' },
    { value: 'edge', label: 'Edge Drawing' },
    { value: 'bw', label: 'Black & White Trace' },
    { value: 'color', label: 'Color Regions' },
  ];

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-y-auto shrink-0">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
          <Settings2 size={14} /> Vectorization
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Mode Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-tight">Trace Mode</label>
          <select 
            value={settings.mode}
            onChange={(e) => handleChange('mode', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {modes.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Sensitivity Controls */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-tight flex items-center justify-between">
            Threshold & Sensitivity
            <Info size={10} className="text-zinc-600" />
          </h3>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <label>Detection Sensitivity</label>
                <span>{settings.sensitivity}%</span>
              </div>
              <input 
                type="range" 
                value={settings.sensitivity}
                onChange={(e) => handleChange('sensitivity', parseInt(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <label>B/W Threshold</label>
                <span>{settings.threshold}</span>
              </div>
              <input 
                type="range" 
                min="0" max="255"
                value={settings.threshold}
                onChange={(e) => handleChange('threshold', parseInt(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
              />
            </div>
          </div>
        </div>

        {/* Detail Controls */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-tight">Path & Detail</h3>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <label>Path Simplification</label>
                <span>{settings.simplification}%</span>
              </div>
              <input 
                type="range" 
                value={settings.simplification}
                onChange={(e) => handleChange('simplification', parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <label>Minimum Shape Size</label>
                <span>{settings.minShapeSize}px</span>
              </div>
              <input 
                type="range" 
                min="1" max="100"
                value={settings.minShapeSize}
                onChange={(e) => handleChange('minShapeSize', parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={settings.preserveCorners}
                onChange={(e) => handleChange('preserveCorners', e.target.checked)}
                className="w-3 h-3 rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-offset-zinc-900" 
              />
              <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">Preserve Corners</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={settings.preserveDetails}
                onChange={(e) => handleChange('preserveDetails', e.target.checked)}
                className="w-3 h-3 rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-offset-zinc-900" 
              />
              <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">Preserve Details</span>
            </label>
          </div>
        </div>

        {/* Real World Scaling */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-tight flex items-center gap-2">
            <Maximize2 size={12} /> Real-World Scaling
          </h3>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] text-zinc-500 uppercase">Width</label>
              <input 
                type="number" 
                defaultValue="100"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
              />
            </div>
            <div className="w-20 space-y-1">
              <label className="text-[9px] text-zinc-500 uppercase">Unit</label>
              <select className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200">
                <option value="mm">mm</option>
                <option value="in">in</option>
                <option value="cm">cm</option>
              </select>
            </div>
          </div>
        </div>

        {/* CAD Optimization */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-tight flex items-center gap-2">
            <Layers size={12} /> CAD / 3D Modeling Prep
          </h3>
          
          <div className="grid grid-cols-1 gap-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-3 h-3 rounded border-zinc-700 bg-zinc-800 text-blue-500" defaultChecked />
              <span className="text-[11px] text-zinc-300">Close Open Paths</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-3 h-3 rounded border-zinc-700 bg-zinc-800 text-blue-500" defaultChecked />
              <span className="text-[11px] text-zinc-300">Remove Duplicates</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-3 h-3 rounded border-zinc-700 bg-zinc-800 text-blue-500" />
              <span className="text-[11px] text-zinc-300">Even-Odd Fill Rule</span>
            </label>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-2">
          <button 
            onClick={onVectorize}
            disabled={isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Zap size={18} className={isProcessing ? "animate-pulse" : ""} />
            {isProcessing ? 'Vectorizing...' : 'Generate SVG'}
          </button>
          
          <button 
            onClick={onAutoClean}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded text-[11px] font-semibold border border-zinc-700 transition-colors"
          >
            AUTO CLEAN GEOMETRY
          </button>
        </div>
      </div>

      <div className="mt-auto p-4 border-t border-zinc-800 bg-zinc-950/50">
        <button 
          onClick={onExport}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs font-medium transition-colors border border-zinc-700"
        >
          <Download size={14} /> Export SVG
        </button>
      </div>
    </div>
  );
};

export default SidebarRight;
