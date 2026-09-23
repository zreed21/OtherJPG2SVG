import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Crop as CropIcon,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Sun,
  Contrast,
  RefreshCw
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CropModal } from './CropModal';
import { processImageFilters, PreprocessingOptions } from '../utils/imageProcessing';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarLeftProps {
  sourceImage: string | null;
  onUpload: (file: File) => void;
  onReset: () => void;
  bgOpacity: number;
  setBgOpacity: (val: number) => void;
  setSourceImage?: (img: string | null) => void;
}

const SidebarLeft: React.FC<SidebarLeftProps> = ({ 
  sourceImage, 
  onUpload, 
  onReset,
  bgOpacity,
  setBgOpacity,
  setSourceImage,
}) => {
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawOriginalImage, setRawOriginalImage] = useState<string | null>(null);

  // Preprocessing options
  const [filters, setFilters] = useState<PreprocessingOptions>({
    brightness: 0,
    contrast: 0,
    grayscale: false,
    invert: false,
    removeBackground: false,
    bgSensitivity: 35,
  });

  const debounceTimerRef = useRef<number | null>(null);

  // Keep track of original raw upload
  useEffect(() => {
    if (sourceImage && !rawOriginalImage) {
      setRawOriginalImage(sourceImage);
    }
  }, [sourceImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          setRawOriginalImage(url);
          if (setSourceImage) setSourceImage(url);
        };
        reader.readAsDataURL(acceptedFiles[0]);
      }
    },
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.bmp', '.tiff'] },
    multiple: false,
  });

  // Re-apply filters whenever filter settings change
  useEffect(() => {
    if (!rawOriginalImage || !setSourceImage) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        const processed = await processImageFilters(rawOriginalImage, filters);
        setSourceImage(processed);
      } catch (e) {
        console.error('Filter processing error:', e);
      }
    }, 60);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [filters, rawOriginalImage]);

  // Rotate / Flip helpers
  const transformImage = (callback: (ctx: CanvasRenderingContext2D, img: HTMLImageElement, canvas: HTMLCanvasElement) => void) => {
    if (!rawOriginalImage || !setSourceImage) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      callback(ctx, img, canvas);
      const transformedUrl = canvas.toDataURL('image/png');
      setRawOriginalImage(transformedUrl);
      const processed = await processImageFilters(transformedUrl, filters);
      setSourceImage(processed);
    };
    img.src = rawOriginalImage;
  };

  const handleRotate = () => {
    transformImage((ctx, img, canvas) => {
      canvas.width = img.height;
      canvas.height = img.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
    });
  };

  const handleFlipH = () => {
    transformImage((ctx, img, canvas) => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
    });
  };

  const handleFlipV = () => {
    transformImage((ctx, img, canvas) => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0);
    });
  };

  const handleResetFilters = () => {
    setFilters({
      brightness: 0,
      contrast: 0,
      grayscale: false,
      invert: false,
      removeBackground: false,
      bgSensitivity: 35,
    });
  };

  return (
    <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-y-auto shrink-0">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <ImageIcon size={14} /> Source Image
        </h2>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {/* Upload Area with transparency checkerboard background */}
        <div 
          {...getRootProps()} 
          className={cn(
            "aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group",
            isDragActive ? "border-blue-500 bg-blue-500/10" : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/50"
          )}
        >
          <input {...getInputProps()} />
          {sourceImage ? (
            <>
              {/* Checkerboard background for transparent images */}
              <div 
                className="w-full h-full flex items-center justify-center p-2"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%)',
                  backgroundSize: '16px 16px',
                  backgroundColor: '#27272a'
                }}
              >
                <img src={sourceImage} alt="Source" className="max-h-full max-w-full object-contain shadow-md rounded" />
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Upload className="text-white" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-500 px-4 text-center">
              <Upload size={32} />
              <p className="text-xs font-medium">Click or drag image to start</p>
            </div>
          )}
        </div>

        {sourceImage && (
          <div className="flex flex-col gap-4">
            {/* Rotate, Crop, Flip Tools */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleRotate}
                className="flex items-center justify-center gap-1.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-colors font-medium border border-zinc-700"
              >
                <RotateCw size={13} className="text-blue-400" /> Rotate 90°
              </button>

              <button 
                onClick={() => setIsCropOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded text-xs transition-colors font-semibold shadow-sm"
              >
                <CropIcon size={13} className="text-blue-400" /> Crop Area
              </button>

              <button 
                onClick={handleFlipH}
                className="flex items-center justify-center gap-1.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-colors border border-zinc-700"
              >
                <FlipHorizontal size={13} /> Flip H
              </button>

              <button 
                onClick={handleFlipV}
                className="flex items-center justify-center gap-1.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-colors border border-zinc-700"
              >
                <FlipVertical size={13} /> Flip V
              </button>
            </div>

            {/* PREPROCESSING & REMOVE BACKGROUND SECTION */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-tight">
                  Preprocessing & Cleanup
                </h3>
                <button
                  onClick={handleResetFilters}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                  title="Reset preprocessing filters"
                >
                  <RefreshCw size={10} /> Reset
                </button>
              </div>

              {/* REMOVE BACKGROUND TOGGLE & SENSITIVITY */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-zinc-200 block">
                        Remove Background
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        Isolates ink on transparent layer
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.removeBackground}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, removeBackground: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 cursor-pointer accent-emerald-500"
                  />
                </div>

                {filters.removeBackground && (
                  <div className="space-y-1 pt-1.5 border-t border-zinc-850">
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>Cutout Sensitivity</span>
                      <span className="font-mono text-emerald-400 font-semibold">{filters.bgSensitivity}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="85"
                      value={filters.bgSensitivity}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, bgSensitivity: parseInt(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Brightness & Contrast */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Sun size={11} /> Brightness
                    </span>
                    <span className="font-mono text-zinc-300">{filters.brightness}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="-80" max="80"
                    value={filters.brightness}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, brightness: parseInt(e.target.value) }))
                    }
                    className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Contrast size={11} /> Contrast
                    </span>
                    <span className="font-mono text-zinc-300">{filters.contrast}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="-80" max="80"
                    value={filters.contrast}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, contrast: parseInt(e.target.value) }))
                    }
                    className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                  />
                </div>
              </div>

              {/* Grayscale & Invert Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer p-2 bg-zinc-800/60 rounded border border-zinc-700/60 hover:bg-zinc-800">
                  <input 
                    type="checkbox" 
                    checked={filters.grayscale}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, grayscale: e.target.checked }))
                    }
                    className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-blue-500" 
                  />
                  <span className="text-xs text-zinc-300">Grayscale</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 bg-zinc-800/60 rounded border border-zinc-700/60 hover:bg-zinc-800">
                  <input 
                    type="checkbox" 
                    checked={filters.invert}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, invert: e.target.checked }))
                    }
                    className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-blue-500" 
                  />
                  <span className="text-xs text-zinc-300">Invert</span>
                </label>
              </div>
            </div>

            {/* Canvas View Layer Opacity */}
            <div className="space-y-2 pt-4 border-t border-zinc-800">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-tight">Canvas View</h3>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Background Image Opacity</span>
                  <span className="font-mono text-zinc-200">{Math.round(bgOpacity * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="1" step="0.05"
                  value={bgOpacity}
                  onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                />
              </div>
            </div>

            <button 
              onClick={() => {
                setRawOriginalImage(null);
                onReset();
              }}
              className="mt-2 flex items-center justify-center gap-2 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded text-xs transition-colors border border-red-900/50"
            >
              <Trash2 size={14} /> Clear Image
            </button>
          </div>
        )}
      </div>

      {/* Interactive Crop Modal */}
      {rawOriginalImage && (
        <CropModal
          isOpen={isCropOpen}
          imageSrc={rawOriginalImage}
          onClose={() => setIsCropOpen(false)}
          onApplyCrop={async (croppedUrl) => {
            setRawOriginalImage(croppedUrl);
            const processed = await processImageFilters(croppedUrl, filters);
            if (setSourceImage) setSourceImage(processed);
          }}
        />
      )}
    </div>
  );
};

export default SidebarLeft;
