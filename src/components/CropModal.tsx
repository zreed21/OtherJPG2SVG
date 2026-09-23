import React, { useState, useRef, useEffect } from 'react';
import { Check, X, RotateCw, ZoomIn, ZoomOut, Crop as CropIcon } from 'lucide-react';

interface CropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onApplyCrop: (croppedDataUrl: string) => void;
}

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onApplyCrop,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Crop box in percentage (0 to 100)
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });

  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 10, y: 10, width: 80, height: 80 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.width,
      cropH: crop.height,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.y) / rect.height) * 100;

    if (dragHandle === 'move') {
      const newX = Math.max(0, Math.min(100 - dragStart.cropW, dragStart.cropX + dx));
      const newY = Math.max(0, Math.min(100 - dragStart.cropH, dragStart.cropY + dy));
      setCrop((prev) => ({ ...prev, x: newX, y: newY }));
    } else if (dragHandle === 'se') {
      const newW = Math.max(10, Math.min(100 - dragStart.cropX, dragStart.cropW + dx));
      const newH = Math.max(10, Math.min(100 - dragStart.cropY, dragStart.cropH + dy));
      setCrop((prev) => ({ ...prev, width: newW, height: newH }));
    } else if (dragHandle === 'nw') {
      const newX = Math.max(0, Math.min(dragStart.cropX + dragStart.cropW - 10, dragStart.cropX + dx));
      const newY = Math.max(0, Math.min(dragStart.cropY + dragStart.cropH - 10, dragStart.cropY + dy));
      const newW = dragStart.cropW - (newX - dragStart.cropX);
      const newH = dragStart.cropH - (newY - dragStart.cropY);
      setCrop({ x: newX, y: newY, width: newW, height: newH });
    } else if (dragHandle === 'ne') {
      const newY = Math.max(0, Math.min(dragStart.cropY + dragStart.cropH - 10, dragStart.cropY + dy));
      const newW = Math.max(10, Math.min(100 - dragStart.cropX, dragStart.cropW + dx));
      const newH = dragStart.cropH - (newY - dragStart.cropY);
      setCrop((prev) => ({ ...prev, y: newY, width: newW, height: newH }));
    } else if (dragHandle === 'sw') {
      const newX = Math.max(0, Math.min(dragStart.cropX + dragStart.cropW - 10, dragStart.cropX + dx));
      const newW = dragStart.cropW - (newX - dragStart.cropX);
      const newH = Math.max(10, Math.min(100 - dragStart.cropY, dragStart.cropH + dy));
      setCrop((prev) => ({ ...prev, x: newX, width: newW, height: newH }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragHandle(null);
  };

  const handleCropConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    const sourceX = Math.round((crop.x / 100) * naturalW);
    const sourceY = Math.round((crop.y / 100) * naturalH);
    const sourceW = Math.round((crop.width / 100) * naturalW);
    const sourceH = Math.round((crop.height / 100) * naturalH);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, sourceW);
    canvas.height = Math.max(1, sourceH);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
    const croppedUrl = canvas.toDataURL('image/png');
    onApplyCrop(croppedUrl);
    onClose();
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CropIcon className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white text-base">Crop Original Image</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Crop Stage */}
        <div className="p-6 flex-1 flex items-center justify-center overflow-hidden bg-zinc-950">
          <div
            ref={containerRef}
            className="relative inline-block max-h-[60vh] max-w-[80vw]"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="To Crop"
              className="max-h-[60vh] w-auto object-contain block pointer-events-none select-none"
            />

            {/* Dark Mask with Crop Window Cutout */}
            <div
              className="absolute inset-0 pointer-events-none border border-white/20"
              style={{
                background: `
                  linear-gradient(to right, rgba(0,0,0,0.6) ${crop.x}%, transparent ${crop.x}%, transparent ${crop.x + crop.width}%, rgba(0,0,0,0.6) ${crop.x + crop.width}%),
                  linear-gradient(to bottom, rgba(0,0,0,0.6) ${crop.y}%, transparent ${crop.y}%, transparent ${crop.y + crop.height}%, rgba(0,0,0,0.6) ${crop.y + crop.height}%)
                `,
              }}
            />

            {/* Active Crop Box */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'move')}
              className="absolute border-2 border-blue-400 cursor-move shadow-2xl"
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.width}%`,
                height: `${crop.height}%`,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
              }}
            >
              {/* Grid 3x3 rule of thirds */}
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40 border border-blue-400/40">
                <div className="border-r border-b border-blue-400/30" />
                <div className="border-r border-b border-blue-400/30" />
                <div className="border-b border-blue-400/30" />
                <div className="border-r border-b border-blue-400/30" />
                <div className="border-r border-b border-blue-400/30" />
                <div className="border-b border-blue-400/30" />
                <div className="border-r border-blue-400/30" />
                <div className="border-r border-blue-400/30" />
                <div />
              </div>

              {/* Corner Handles */}
              <div
                onMouseDown={(e) => handleMouseDown(e, 'nw')}
                className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize"
              />
              <div
                onMouseDown={(e) => handleMouseDown(e, 'ne')}
                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-sm cursor-nesw-resize"
              />
              <div
                onMouseDown={(e) => handleMouseDown(e, 'sw')}
                className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-sm cursor-nesw-resize"
              />
              <div
                onMouseDown={(e) => handleMouseDown(e, 'se')}
                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            Drag the box or corner handles to select your drawing area
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCropConfirm}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all"
            >
              <Check size={16} />
              <span>Apply Crop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
