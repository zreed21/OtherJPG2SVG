import React, { useState, useCallback, useRef, useEffect } from 'react';
import SidebarLeft from './components/SidebarLeft';
import SidebarRight from './components/SidebarRight';
import MainCanvas from './components/MainCanvas';
import Toolbar from './components/Toolbar';
import { useVectorization, SvgPath } from './hooks/useVectorization';

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
  // CAD & Real World Scaling
  realWorldWidth: number;
  realWorldUnit: 'mm' | 'in' | 'cm' | 'px';
  cadClosePaths: boolean;
  cadRemoveDuplicates: boolean;
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
  realWorldWidth: 100,
  realWorldUnit: 'mm',
  cadClosePaths: true,
  cadRemoveDuplicates: true,
};

const App: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTool, setActiveTool] = useState<'select' | 'remove' | 'wand' | 'node'>('select');
  const [bgOpacity, setBgOpacity] = useState(0.3);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<SvgPath[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const { vectorize, isProcessing, svgPaths, setSvgPaths } = useVectorization();

  // Push to history when paths change
  const updatePathsWithHistory = useCallback((newPathsOrUpdater: SvgPath[] | ((prev: SvgPath[]) => SvgPath[])) => {
    setSvgPaths((prev) => {
      const nextPaths = typeof newPathsOrUpdater === 'function' ? newPathsOrUpdater(prev) : newPathsOrUpdater;
      
      setHistory((prevHist) => {
        const sliced = prevHist.slice(0, historyIndex + 1);
        return [...sliced, nextPaths];
      });
      setHistoryIndex((prevIdx) => prevIdx + 1);

      return nextPaths;
    });
  }, [historyIndex, setSvgPaths]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setSvgPaths(history[newIdx]);
    }
  }, [historyIndex, history, setSvgPaths]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setSvgPaths(history[newIdx]);
    }
  }, [historyIndex, history, setSvgPaths]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setSourceImage(url);
      setHistory([]);
      setHistoryIndex(-1);
    };
    reader.readAsDataURL(file);
  };

  const handleVectorize = useCallback(async () => {
    if (!sourceImage) return;
    await vectorize(sourceImage, settings);
  }, [sourceImage, settings, vectorize]);

  // Record initial vectorization to history
  useEffect(() => {
    if (svgPaths.length > 0 && history.length === 0) {
      setHistory([svgPaths]);
      setHistoryIndex(0);
    }
  }, [svgPaths, history.length]);

  const handleExport = useCallback(() => {
    if (svgPaths.length === 0) return;
    
    let pathList = [...svgPaths];

    // CAD Optimization: Remove duplicates
    if (settings.cadRemoveDuplicates) {
      const seen = new Set<string>();
      pathList = pathList.filter((p) => {
        if (seen.has(p.d)) return false;
        seen.add(p.d);
        return true;
      });
    }

    // CAD Optimization: Close open paths
    if (settings.cadClosePaths) {
      pathList = pathList.map((p) => {
        let d = p.d.trim();
        if (!d.endsWith('Z') && !d.endsWith('z') && d.length > 5) {
          d += ' Z';
        }
        return { ...p, d };
      });
    }

    const svgContent = pathList.map(p => 
      `  <path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" opacity="${p.opacity}" fill-rule="${settings.fillRule}" />`
    ).join('\n');
    
    // Physical unit scaling
    const unit = settings.realWorldUnit;
    const widthAttr = unit !== 'px' ? `width="${settings.realWorldWidth}${unit}"` : '';

    const fullSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ${widthAttr} viewBox="0 0 1000 1000">
${svgContent}
</svg>`;

    const blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vectorized_${settings.mode}_${settings.realWorldWidth}${settings.realWorldUnit}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [svgPaths, settings]);

  const handleAutoClean = useCallback(() => {
    updatePathsWithHistory((prev) => {
      const seen = new Set<string>();
      return prev
        .filter((p) => {
          // Remove tiny specks/noise
          if (p.d.length < 25) return false;
          // Remove duplicate paths
          if (seen.has(p.d)) return false;
          seen.add(p.d);
          return true;
        })
        .map((p) => {
          // Clean & snap end if close
          let d = p.d.trim();
          if (settings.cadClosePaths && !d.endsWith('Z') && !d.endsWith('z')) {
            d += ' Z';
          }
          return { ...p, d };
        });
    });
  }, [updatePathsWithHistory, settings.cadClosePaths]);

  // Canvas trigger for fit to screen
  const [fitTrigger, setFitTrigger] = useState(0);
  const handleFitToScreen = () => {
    setFitTrigger((t) => t + 1);
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-900 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar Left: Source & Image Preprocessing */}
      <SidebarLeft 
        sourceImage={sourceImage} 
        onUpload={handleImageUpload} 
        onReset={() => {
          setSourceImage(null);
          setSvgPaths([]);
          setHistory([]);
          setHistoryIndex(-1);
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
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onFitToScreen={handleFitToScreen}
          onExport={handleExport}
        />

        {/* Center Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <MainCanvas 
            sourceImage={sourceImage}
            svgPaths={svgPaths}
            activeTool={activeTool}
            setSvgPaths={updatePathsWithHistory}
            isProcessing={isProcessing}
            bgOpacity={bgOpacity}
            fitTrigger={fitTrigger}
          />
        </div>

        {/* Status Bar */}
        <div className="h-8 bg-zinc-900 border-t border-zinc-800 flex items-center px-4 text-xs text-zinc-400 justify-between select-none">
          <div className="flex gap-4 items-center">
            <span>Objects: <strong className="text-zinc-200">{svgPaths.length}</strong></span>
            <span className="text-zinc-600">|</span>
            <span>Mode: <strong className="text-blue-400 capitalize">{settings.mode.replace('_', ' ')}</strong></span>
            <span className="text-zinc-600">|</span>
            <span>Scale: <strong className="text-zinc-200">{settings.realWorldWidth} {settings.realWorldUnit}</strong></span>
          </div>
          <div className="flex gap-4 items-center">
            <span className="text-zinc-500">Shortcuts: Ctrl+Z (Undo), Del (Delete), Wheel (Zoom)</span>
            <span className="text-zinc-600">|</span>
            <span>{isProcessing ? '⚡ Vectorizing...' : '🟢 Ready'}</span>
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
