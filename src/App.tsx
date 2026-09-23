import React, { useState, useCallback } from 'react';
import SidebarLeft from './components/SidebarLeft';
import SidebarRight from './components/SidebarRight';
import MainCanvas from './components/MainCanvas';
import Toolbar from './components/Toolbar';
import { useVectorization } from './hooks/useVectorization';

export type VectorizationMode = 'same_size_line' | 'silhouette' | 'outline' | 'multiple' | 'edge' | 'bw' | 'color';

export interface AppSettings {
  sensitivity: number;
  threshold: number;
  edgeSensitivity: number;
  minShapeSize: number;
  simplification: number;
  smoothing: number;
  mode: VectorizationMode;
  colors: number;
  preserveCorners: boolean;
  preserveDetails: boolean;
  fillRule: 'nonzero' | 'evenodd';
  // Same Size Line & Connect / Smooth parameters
  lineWidth: number;
  connectGaps: boolean;
  gapMaxDistance: number;
  humanErrorSmoothing: number;
  adaptiveLighting: boolean;
  adaptiveSensitivity: number;
  strokeColor: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  sensitivity: 50,
  threshold: 128,
  edgeSensitivity: 50,
  minShapeSize: 10,
  simplification: 20,
  smoothing: 20,
  mode: 'same_size_line',
  colors: 8,
  preserveCorners: true,
  preserveDetails: false,
  fillRule: 'evenodd',
  lineWidth: 3.5,
  connectGaps: true,
  gapMaxDistance: 25,
  humanErrorSmoothing: 5.0,
  adaptiveLighting: true,
  adaptiveSensitivity: 15,
  strokeColor: '#000000',
};

const App: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTool, setActiveTool] = useState<'select' | 'remove' | 'wand' | 'node'>('select');
  const [bgOpacity, setBgOpacity] = useState(0.3);

  const { vectorize, isProcessing, svgPaths, setSvgPaths } = useVectorization();

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSourceImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVectorize = useCallback(async () => {
    if (!sourceImage) return;
    await vectorize(sourceImage, settings);
  }, [sourceImage, settings, vectorize]);

  const handleExport = useCallback(() => {
    if (svgPaths.length === 0) return;
    
    const svgContent = svgPaths.map(p => 
      `<path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" opacity="${p.opacity}" />`
    ).join('\n');
    
    const fullSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1">
${svgContent}
</svg>`;

    const blob = new Blob([fullSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vectorized_output.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [svgPaths]);

  const handleUndo = () => {};
  const handleRedo = () => {};

  const handleAutoClean = useCallback(() => {
    setSvgPaths(prev => {
      const seen = new Set();
      return prev.filter(p => {
        if (p.d.length < 20) return false;
        if (seen.has(p.d)) return false;
        seen.add(p.d);
        return true;
      });
    });
  }, [setSvgPaths]);

  return (
    <div className="flex h-screen w-screen bg-zinc-900 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar Left: Source & Image Preprocessing */}
      <SidebarLeft 
        sourceImage={sourceImage} 
        onUpload={handleImageUpload} 
        onReset={() => {
          setSourceImage(null);
          setSvgPaths([]);
        }}
        bgOpacity={bgOpacity}
        setBgOpacity={setBgOpacity}
        setSourceImage={setSourceImage}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
        {/* Top Toolbar */}
        <Toolbar 
          activeTool={activeTool} 
          setActiveTool={setActiveTool}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExport={handleExport}
        />

        {/* Center Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <MainCanvas 
            sourceImage={sourceImage}
            svgPaths={svgPaths}
            activeTool={activeTool}
            setSvgPaths={setSvgPaths}
            isProcessing={isProcessing}
            bgOpacity={bgOpacity}
          />
        </div>

        {/* Status Bar */}
        <div className="h-8 bg-zinc-900 border-t border-zinc-800 flex items-center px-4 text-xs text-zinc-500 justify-between">
          <div className="flex gap-4">
            <span>Objects: {svgPaths.length}</span>
            <span>Mode: {settings.mode}</span>
          </div>
          <div className="flex gap-4">
            <span>{isProcessing ? 'Vectorizing...' : 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* Sidebar Right: Vector Settings & Export */}
      <SidebarRight 
        settings={settings} 
        setSettings={setSettings}
        onVectorize={handleVectorize}
        onExport={handleExport}
        onAutoClean={handleAutoClean}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default App;
