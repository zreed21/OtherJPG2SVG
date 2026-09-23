import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { SvgPath } from '../hooks/useVectorization';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface MainCanvasProps {
  sourceImage: string | null;
  svgPaths: SvgPath[];
  activeTool: 'select' | 'remove' | 'wand' | 'node';
  setSvgPaths: React.Dispatch<React.SetStateAction<SvgPath[]>>;
  isProcessing: boolean;
  bgOpacity: number;
}

const MainCanvas: React.FC<MainCanvasProps> = ({ 
  sourceImage, 
  svgPaths, 
  activeTool, 
  setSvgPaths,
  isProcessing,
  bgOpacity
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [zoom, setZoom] = useState(1);

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#09090b',
      preserveObjectStacking: true,
      selection: activeTool === 'select',
    });

    fabricCanvasRef.current = canvas;

    // Zoom on wheel
    canvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom();
      newZoom *= 0.999 ** delta;
      if (newZoom > 20) newZoom = 20;
      if (newZoom < 0.1) newZoom = 0.1;
      canvas.setZoom(newZoom);
      setZoom(newZoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Handle delete on click with remove tool
    canvas.on('mouse:down', (opt: any) => {
      if (opt.target && (opt.target as any).customId) {
        const id = (opt.target as any).customId;
        if (activeTool === 'remove') {
          setSvgPaths((prev) => prev.filter((p) => p.id !== id));
        }
      }
    });

    const handleResize = () => {
      if (!containerRef.current || !fabricCanvasRef.current) return;
      fabricCanvasRef.current.setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeTool === 'select') {
        const active = canvas.getActiveObjects();
        if (active && active.length > 0) {
          const idsToRemove = active.map((obj: any) => obj.customId).filter(Boolean);
          if (idsToRemove.length > 0) {
            setSvgPaths((prev) => prev.filter((p) => !idsToRemove.includes(p.id)));
          }
          canvas.discardActiveObject();
          canvas.requestRenderAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  // Update canvas selection mode on tool change
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    canvas.selection = activeTool === 'select';
    canvas.forEachObject((obj: any) => {
      if (obj.customId) {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select' || activeTool === 'remove';
        obj.hoverCursor = activeTool === 'remove' ? 'not-allowed' : 'move';
      }
    });
    canvas.requestRenderAll();
  }, [activeTool]);

  // Load Image and SVG Paths in batch
  useEffect(() => {
    let isCancelled = false;

    const renderObjects = async () => {
      if (!fabricCanvasRef.current || !sourceImage) return;
      const canvas = fabricCanvasRef.current;

      canvas.clear();
      canvas.backgroundColor = '#09090b';

      try {
        const img = await fabric.FabricImage.fromURL(sourceImage, { crossOrigin: 'anonymous' });
        if (isCancelled) return;

        img.set({
          selectable: false,
          evented: false,
          opacity: bgOpacity,
        });

        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();
        const imgRatio = img.width! / img.height!;
        const canvasRatio = canvasWidth / canvasHeight;

        if (imgRatio > canvasRatio) {
          img.scaleToWidth(canvasWidth * 0.85);
        } else {
          img.scaleToHeight(canvasHeight * 0.85);
        }

        canvas.centerObject(img);
        canvas.add(img);
        canvas.sendObjectToBack(img);

        const imgLeft = img.left!;
        const imgTop = img.top!;
        const scaleX = img.scaleX!;
        const scaleY = img.scaleY!;

        if (svgPaths.length > 0) {
          // Combine all paths into a single SVG document for fast 1-pass parsing
          const pathElements = svgPaths
            .filter((p) => p.d)
            .map(
              (p, i) =>
                `<path id="${p.id}" data-idx="${i}" d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.strokeWidth || 1}" opacity="${p.opacity}" />`
            )
            .join('\n');

          const combinedSvg = `<svg xmlns="http://www.w3.org/2000/svg">${pathElements}</svg>`;
          const parsed = await fabric.loadSVGFromString(combinedSvg);

          if (!isCancelled && parsed.objects) {
            for (let i = 0; i < parsed.objects.length; i++) {
              const obj = parsed.objects[i];
              const pathData = svgPaths[i];
              if (!obj || !pathData) continue;

              (obj as any).customId = pathData.id;
              obj.scaleX = (obj.scaleX || 1) * scaleX;
              obj.scaleY = (obj.scaleY || 1) * scaleY;
              obj.left = imgLeft + (obj.left || 0) * scaleX;
              obj.top = imgTop + (obj.top || 0) * scaleY;

              obj.selectable = activeTool === 'select';
              obj.evented = activeTool === 'select' || activeTool === 'remove';
              obj.hoverCursor = activeTool === 'remove' ? 'not-allowed' : 'move';

              canvas.add(obj);
            }
          }
        }

        canvas.requestRenderAll();
      } catch (err) {
        console.error('Error rendering canvas:', err);
      }
    };

    renderObjects();

    return () => {
      isCancelled = true;
    };
  }, [sourceImage, svgPaths, bgOpacity, activeTool]);

  const handleResetZoom = () => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.setZoom(1);
    fabricCanvasRef.current.viewportTransform = [1, 0, 0, 1, 0, 0];
    setZoom(1);
    fabricCanvasRef.current.requestRenderAll();
  };

  const handleZoom = (factor: number) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    let newZoom = canvas.getZoom() * factor;
    newZoom = Math.max(0.1, Math.min(20, newZoom));
    canvas.setZoom(newZoom);
    setZoom(newZoom);
    canvas.requestRenderAll();
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair bg-zinc-950 overflow-hidden select-none">
      <canvas ref={canvasRef} />

      {!sourceImage && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 pointer-events-none p-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shadow-xl">
              <span className="text-2xl">🎨</span>
            </div>
            <p className="text-base font-semibold text-zinc-300">No Image Loaded</p>
            <p className="text-xs text-zinc-500 max-w-sm">
              Upload an image from the left panel, choose your trace mode (e.g. Same-Size Line), and click <strong>Generate SVG</strong>.
            </p>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 px-6 py-5 rounded-xl shadow-2xl flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-zinc-100 font-semibold text-sm tracking-wide">
              Vectorizing Artwork & Extracting Paths...
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 flex items-center gap-3 shadow-lg">
        <div className="flex items-center gap-1 border-r border-zinc-800 pr-2">
          <button
            onClick={() => handleZoom(0.8)}
            className="p-1 hover:text-white rounded"
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span className="font-mono text-zinc-200 text-[11px] w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(1.25)}
            className="p-1 hover:text-white rounded"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1 hover:text-white rounded ml-1"
            title="Reset Zoom"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        <span className="font-medium text-zinc-300">
          Paths: <strong className="text-blue-400">{svgPaths.length}</strong>
        </span>
      </div>
    </div>
  );
};

export default MainCanvas;
