import React from 'react';
import { 
  Zap, 
  Settings2, 
  Maximize2, 
  Download,
  Info,
  Layers,
  Sparkles,
  Link,
  SunMedium,
  Feather
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
    { value: 'same_size_line', label: '✏️ Same-Size Line (Sketches & Line Art)' },
    { value: 'silhouette', label: 'Silhouette' },
    { value: 'outline', label: 'Outline' },
    { value: 'multiple', label: 'Multiple Shapes' },
    { value: 'edge', label: 'Edge Drawing' },
    { value: 'bw', label: 'Black & White Trace' },
    { value: 'color', label: 'Color Regions' },
  ];

  const PRESET_SMOOTHINGS = [
    { label: 'Faithful', value: 2.0 },
    { label: 'Smooth', value: 5.0 },
    { label: 'Ultra Fairing', value: 8.5 },
  ];

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-y-auto shrink-0">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
          <Settings2 size={14} /> Vectorization Engine
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Mode Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-tight">Trace Mode</label>
          <select 
            value={settings.mode}
            onChange={(e) => handleChange('mode', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          >
            {modes.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* SAME SIZE LINE CONTROLS */}
        {settings.mode === 'same_size_line' ? (
          <div className="space-y-5">
            {/* 1. Connect Gaps & Auto-Close */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-blue-500/20 text-blue-400">
                    <Link size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">
                      Connect & Close Lines
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Bridges pen breaks into loops
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.connectGaps}
                  onChange={(e) => handleChange('connectGaps', e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-500 cursor-pointer"
                />
              </div>

              {settings.connectGaps && (
                <div className="space-y-1 pt-1.5 border-t border-zinc-850">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Max Gap Bridge Distance</span>
                    <span className="font-mono text-blue-400 font-semibold">{settings.gapMaxDistance}px</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={settings.gapMaxDistance}
                    onChange={(e) => handleChange('gapMaxDistance', parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* 2. Human Error Removal & Smoothing */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">
                      Smooth Human Errors
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Removes jitters into clean curve
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400 px-1.5 py-0.5 rounded bg-zinc-800">
                  {settings.humanErrorSmoothing.toFixed(1)}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={settings.humanErrorSmoothing}
                onChange={(e) => handleChange('humanErrorSmoothing', parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex gap-1 pt-1">
                {PRESET_SMOOTHINGS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => handleChange('humanErrorSmoothing', p.value)}
                    className={`flex-1 py-1 text-[10px] rounded border transition-colors ${
                      Math.abs(settings.humanErrorSmoothing - p.value) < 0.3
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Uniform Stroke Thickness */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-300">
                <label className="flex items-center gap-1.5 font-medium">
                  <Feather size={13} className="text-blue-400" />
                  <span>Uniform Line Thickness</span>
                </label>
                <span className="font-mono text-blue-400 font-bold">{settings.lineWidth}px</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="25"
                step="0.5"
                value={settings.lineWidth}
                onChange={(e) => handleChange('lineWidth', parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 4. Phone Photo Lighting / Shadow Removal */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <SunMedium size={14} className="text-amber-400" />
                  <span className="text-xs font-medium text-zinc-300">
                    Phone Shadow Removal
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.adaptiveLighting}
                  onChange={(e) => handleChange('adaptiveLighting', e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-500 cursor-pointer"
                />
              </div>

              {settings.adaptiveLighting ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Adaptive Sensitivity</span>
                    <span className="font-mono text-blue-400">{settings.adaptiveSensitivity}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="45"
                    value={settings.adaptiveSensitivity}
                    onChange={(e) => handleChange('adaptiveSensitivity', parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Threshold</span>
                    <span className="font-mono text-blue-400">{settings.threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={settings.threshold}
                    onChange={(e) => handleChange('threshold', parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* 5. Stroke Color */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800">
              <label className="text-xs font-medium text-zinc-300">Stroke Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.strokeColor}
                  onChange={(e) => handleChange('strokeColor', e.target.value)}
                  className="w-8 h-8 rounded bg-transparent cursor-pointer border border-zinc-700"
                />
                <span className="text-xs font-mono text-zinc-400">{settings.strokeColor}</span>
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD IMAGETRACER CONTROLS */
          <>
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
            </div>
          </>
        )}

        {/* Action Button */}
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
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
