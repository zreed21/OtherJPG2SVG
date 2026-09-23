import { useState, useCallback } from 'react';
import * as ImageTracerModule from 'imagetracerjs';
import { AppSettings } from '../App';
import { traceCenterlines } from '../utils/centerlineTracer';
import { traceOutlinesFast } from '../utils/outlineTracer';

// @ts-ignore
const ImageTracer = ImageTracerModule.default || ImageTracerModule;

export interface SvgPath {
  id: string;
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  type: 'path' | 'rect' | 'circle';
}

export const useVectorization = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSvg, setResultSvg] = useState<string | null>(null);
  const [svgPaths, setSvgPaths] = useState<SvgPath[]>([]);

  const vectorize = useCallback(async (imageSrc: string, settings: AppSettings) => {
    setIsProcessing(true);
    
    // Defer execution by 20ms so React updates the loading spinner on screen
    await new Promise((r) => setTimeout(r, 20));

    try {
      // Step 1: Safely load & downscale high-resolution phone images to max 1000px
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });

      let width = img.width;
      let height = img.height;
      const MAX_DIM = 1000;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not create canvas context');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const imgData = ctx.getImageData(0, 0, width, height);

      // Mode A: Same-Size Line (Centerline / Skeleton Tracing with Gap Bridging & Smoothing)
      if (settings.mode === 'same_size_line') {
        const res = traceCenterlines(imgData, {
          threshold: settings.threshold,
          adaptiveLighting: settings.adaptiveLighting,
          adaptiveSensitivity: settings.adaptiveSensitivity,
          invert: false,
          lineWidth: settings.lineWidth,
          strokeColor: settings.strokeColor || '#000000',
          fillBackground: 'none',
          lineCap: 'round',
          lineJoin: 'round',
          connectGaps: settings.connectGaps,
          gapMaxDistance: settings.gapMaxDistance,
          autoCloseLoops: true,
          humanErrorSmoothing: settings.humanErrorSmoothing,
          minPathLength: Math.max(5, settings.minShapeSize),
        });

        setResultSvg(res.svg);

        const paths: SvgPath[] = res.paths.map((p, index) => ({
          id: `path-centerline-${Date.now()}-${index}`,
          d: p.d,
          fill: 'none',
          stroke: settings.strokeColor || '#000000',
          strokeWidth: settings.lineWidth,
          opacity: 1,
          type: 'path' as const,
        }));

        setSvgPaths(paths);
        setIsProcessing(false);
        return;
      }

      // Mode B: Fast Outline / Contour Mode
      if (settings.mode === 'outline') {
        const res = traceOutlinesFast(imgData, {
          threshold: settings.threshold,
          invert: false,
          smoothing: Math.max(0.5, (settings.simplification / 100) * 4),
          strokeWidth: 2,
          strokeColor: settings.strokeColor || '#000000',
          fillColor: 'none',
          minArea: Math.max(8, settings.minShapeSize),
        });

        setResultSvg(res.svg);

        const paths: SvgPath[] = res.paths.map((p, index) => ({
          id: `path-outline-${Date.now()}-${index}`,
          d: p.d,
          fill: 'none',
          stroke: p.stroke,
          strokeWidth: p.strokeWidth,
          opacity: 1,
          type: 'path' as const,
        }));

        setSvgPaths(paths);
        setIsProcessing(false);
        return;
      }

      // Mode C: Fast Silhouette / Black & White Filled Mode
      if (settings.mode === 'silhouette' || settings.mode === 'bw') {
        const res = traceOutlinesFast(imgData, {
          threshold: settings.threshold,
          invert: false,
          smoothing: Math.max(0.5, (settings.simplification / 100) * 4),
          strokeWidth: 0,
          strokeColor: 'none',
          fillColor: settings.strokeColor || '#000000',
          minArea: Math.max(8, settings.minShapeSize),
        });

        setResultSvg(res.svg);

        const paths: SvgPath[] = res.paths.map((p, index) => ({
          id: `path-bw-${Date.now()}-${index}`,
          d: p.d,
          fill: p.fill,
          stroke: 'none',
          strokeWidth: 0,
          opacity: 1,
          type: 'path' as const,
        }));

        setSvgPaths(paths);
        setIsProcessing(false);
        return;
      }

      // Mode D: Multi-color / ImageTracer mode with safely scaled canvas
      const scaledDataUrl = canvas.toDataURL('image/png');
      const options: any = {
        ltres: Math.max(1, settings.simplification / 10),
        qtres: Math.max(1, settings.simplification / 5),
        pathomit: Math.max(10, settings.minShapeSize),
        rightangleenhance: settings.preserveCorners,
        colorsampling: settings.mode === 'color' ? 2 : 1,
        numberofcolors: Math.min(16, Math.max(2, settings.colors)),
        scale: 1,
        simplifyTolerance: Math.max(0.2, settings.simplification / 100),
        roundcoords: 1,
        desc: false,
        viewbox: true,
        blurradius: 0,
        blurdelta: 20
      };

      ImageTracer.imageToSVG(
        scaledDataUrl,
        (svgString: string) => {
          setResultSvg(svgString);
          
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgString, 'image/svg+xml');
          const paths = Array.from(doc.querySelectorAll('path')).slice(0, 500).map((p, index) => ({
            id: `path-${Date.now()}-${index}`,
            d: p.getAttribute('d') || '',
            fill: p.getAttribute('fill') || '#000000',
            stroke: p.getAttribute('stroke') || 'none',
            strokeWidth: parseFloat(p.getAttribute('stroke-width') || '0'),
            opacity: parseFloat(p.getAttribute('opacity') || '1'),
            type: 'path' as const
          }));
          
          setSvgPaths(paths);
          setIsProcessing(false);
        },
        options
      );
    } catch (error) {
      console.error('Vectorization failed:', error);
      setIsProcessing(false);
    }
  }, []);

  return {
    vectorize,
    isProcessing,
    resultSvg,
    svgPaths,
    setSvgPaths
  };
};
