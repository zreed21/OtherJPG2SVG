import React from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Crop,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarLeftProps {
  sourceImage: string | null;
  onUpload: (file: File) => void;
  onReset: () => void;
  bgOpacity: number;
  setBgOpacity: (val: number) => void;
}

const SidebarLeft: React.FC<SidebarLeftProps> = ({ 
  sourceImage, 
  onUpload, 
  onReset,
  bgOpacity,
  setBgOpacity
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => acceptedFiles[0] && onUpload(acceptedFiles[0]),
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.bmp', '.tiff'] },
    multiple: false,
  });

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
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs transition-colors">
                <RotateCw size={14} /> Rotate
              </button>
              <button className="flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs transition-colors">
                <Crop size={14} /> Crop
              </button>
              <button className="flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs transition-colors">
                <FlipHorizontal size={14} /> Flip H
              </button>
              <button className="flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs transition-colors">
                <FlipVertical size={14} /> Flip V
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-tight">Preview</h3>
              
              <div className="space-y-3 pb-2 border-b border-zinc-800/50">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <label>Overlay Transparency</label>
                    <span>{Math.round(bgOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.01"
                    value={bgOpacity}
                    onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                  />
                </div>
              </div>

              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-tight pt-2">Preprocessing</h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <label>Brightness</label>
                    <span>0%</span>
                  </div>
                  <input type="range" className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <label>Contrast</label>
                    <span>0%</span>
                  </div>
                  <input type="range" className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-3 h-3 rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-offset-zinc-900" />
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">Grayscale</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-3 h-3 rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-offset-zinc-900" />
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">Invert Colors</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-3 h-3 rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-offset-zinc-900" />
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">Remove Background</span>
                </label>
              </div>
            </div>

            <button 
              onClick={onReset}
              className="mt-4 flex items-center justify-center gap-2 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded text-xs transition-colors border border-red-900/50"
            >
              <Trash2 size={14} /> Clear Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarLeft;
