import React, { useEffect, useRef, useState } from 'react';
import * as fabricModule from 'fabric';
import { SvgPath } from '../hooks/useVectorization';

// @ts-ignore
const fabric = fabricModule.fabric || fabricModule;

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
  const fabricCanvas = useRef<any>(null);
  const [zoom, setZoom] = useState(1);

  // Use a ref for activeTool to avoid re-binding events on every tool change
  const activeToolRef = useRef(activeTool);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });

    fabricCanvas.current = canvas;

    canvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom();
      newZoom *= 0.999 ** delta;
      if (newZoom > 20) newZoom = 20;
      if (newZoom < 0.01) newZoom = 0.01;
      canvas.setZoom(newZoom);
      setZoom(newZoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    canvas.on('mouse:down', (opt: any) => {
      if (activeToolRef.current === 'remove' && opt.target) {
        const id = (opt.target as any).id;
        if (id) {
          setSvgPaths(prev => prev.filter(p => p.id !== id));
        }
      }
    });

    const handleResize = () => {
      if (!containerRef.current || !fabricCanvas.current) return;
      fabricCanvas.current.setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeToolRef.current === 'select') {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
          const idsToRemove = activeObjects.map((obj: any) => obj.id).filter(Boolean);
          if (idsToRemove.length > 0) {
            setSvgPaths(prev => prev.filter(p => !idsToRemove.includes(p.id)));
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
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    
    if (activeTool === 'select') {
      canvas.selection = true;
      canvas.forEachObject((obj: any) => {
        if (obj.id) {
          obj.selectable = true;
          obj.evented = true;
        }
      });
    } else if (activeTool === 'remove') {
      canvas.selection = false;
      canvas.forEachObject((obj: any) => {
        if (obj.id) {
          obj.selectable = false;
          obj.evented = true;
        }
      });
    } else {
      canvas.selection = false;
      canvas.forEachObject((obj: any) => {
        if (obj.id) {
          obj.selectable = false;
          obj.evented = false;
        }
      });
    }
  }, [activeTool]);

  useEffect(() => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    
    canvas.clear();
    
    if (sourceImage) {
      fabric.Image.fromURL(sourceImage, (img: any) => {
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
          img.scaleToWidth(canvasWidth * 0.8);
        } else {
          img.scaleToHeight(canvasHeight * 0.8);
        }
        
        canvas.centerObject(img);
        canvas.add(img);
        canvas.sendToBack(img);

        svgPaths.forEach(pathData => {
          fabric.loadSVGFromString(`<svg><path d="${pathData.d}" fill="${pathData.fill}" stroke="${pathData.stroke}" stroke-width="${pathData.strokeWidth}" opacity="${pathData.opacity}" /></svg>`, (objects: any[]) => {
            const obj = objects[0];
            if (obj) {
              (obj as any).id = pathData.id;
              
              obj.scale(img.scaleX!);
              obj.set({
                left: img.left! + (obj.left! * img.scaleX!),
                top: img.top! + (obj.top! * img.scaleY!),
                selectable: activeTool === 'select',
                evented: activeTool === 'select' || activeTool === 'remove',
                hoverCursor: activeTool === 'remove' ? 'no-drop' : 'move'
              });
              
              canvas.add(obj);
              canvas.renderAll();
            }
          });
        });
      });
    }
  }, [svgPaths, sourceImage, bgOpacity]);

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair canvas-container">
      <canvas ref={canvasRef} />
      
      {!sourceImage && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-600 pointer-events-none">
          <div className="text-center">
            <p className="text-lg font-medium">No Image Loaded</p>
            <p className="text-sm">Upload an image from the left panel to begin</p>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-zinc-100 font-medium tracking-wide">Vectorizing Artwork...</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded-lg px-3 py-1.5 text-[10px] text-zinc-400 flex items-center gap-3">
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Objects: {svgPaths.length}</span>
      </div>
    </div>
  );
};

export default MainCanvas;
