import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Crop as CropIcon,
  Trash2,
  Image as ImageIcon,
  Sliders
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CropModal } from './CropModal';

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
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [isInvert, setIsInvert] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => acceptedFiles[0] && onUpload(acceptedFiles[0]),
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.bmp', '.tiff'] },
    multiple: false,
  });

  // Helper for canvas transformations
  const transformImage = (callback: (ctx: CanvasRenderingContext2D, img: HTMLImageElement, canvas: HTMLCanvasElement) => void) => {
    if (!sourceImage || !setSourceImage) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      callback(ctx, img, canvas);
      setSourceImage(canvas.toDataURL('image/png'));
    };
    img.src = sourceImage;
  };

  // 1. Rotate 90 deg clockwise
  const handleRotate = () => {
    transformImage((ctx, img, canvas) => {
      canvas.width = img.height;
      canvas.height = img.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
    });
  };

  // 2. Flip Horizontal
  const handleFlipH = () => {
    transformImage((ctx, img, canvas) => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
    });
  };

  // 3. Flip Vertical
  const handleFlipV = () => {
    transformImage((ctx, img, canvas) => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0);
    });
  };

  return (
    <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-y-auto shrink-0">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
          <ImageIcon size={14} /> Source Image
        </h2>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {/* Upload Area */}
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
              <img src={sourceImage} alt="Source" className="w-full h-full object-contain" />
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
            {/* Image Tools: Rotate, Crop, Flip H, Flip V */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleRotate}
                className="flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-colors font-medium border border-zinc-700"
              >
                <RotateCw size={14} className="text-blue-400" /> Rotate 90°
              </button>

              <button 
                onClick={() => setIsCropOpen(true)}
                className="flex items-center justify-center gap-2 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded text-xs transition-colors font-semibold shadow-sm"
              >
                <CropIcon size={14} className="text-blue-400" /> Crop Area
              </button>

              <button 
                onClick={handleFlipH}
                className="flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-colors border border-zinc-700"
              >
                <FlipHorizontal size={14} /> Flip H
              </button>

              <button 
                onClick={handleFlipV}
                className="flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-colors border border-zinc-700"
              >
                <FlipVertical size={14} /> Flip V
              </button>
            </div>

            {/* Preview Layer Opacity */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-tight">Canvas View</h3>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <label>Background Image Opacity</label>
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
              onClick={onReset}
              className="mt-2 flex items-center justify-center gap-2 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded text-xs transition-colors border border-red-900/50"
            >
              <Trash2 size={14} /> Clear Image
            </button>
          </div>
        )}
      </div>

      {/* Interactive Crop Modal */}
      {sourceImage && (
        <CropModal
          isOpen={isCropOpen}
          imageSrc={sourceImage}
          onClose={() => setIsCropOpen(false)}
          onApplyCrop={(croppedUrl) => {
            if (setSourceImage) setSourceImage(croppedUrl);
          }}
        />
      )}
    </div>
  );
};

export default SidebarLeft;
