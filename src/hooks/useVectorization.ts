import { useState, useCallback } from 'react';
import * as ImageTracerModule from 'imagetracerjs';
import { AppSettings } from '../App';
import { traceCenterlines } from '../utils/centerlineTracer';

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
    
    try {
      // 1. Same-Size Line / Centerline Mode with Gap Connection & Human Error Smoothing
      if (settings.mode === 'same_size_line') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageSrc;
        });

        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1200;
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

      // 2. Standard ImageTracer Modes (Silhouette, Outline, Color, BW, etc.)
      const options: any = {
        ltres: settings.simplification / 10,
        qtres: settings.simplification / 5,
        pathomit: settings.minShapeSize,
        rightangleenhance: settings.preserveCorners,
        colorsampling: 1,
        numberofcolors: settings.colors,
        mincolorratio: 0.02,
        colorquantcycles: 3,
        scale: 1,
        simplifyTolerance: settings.simplification / 100,
        roundcoords: 2,
        desc: false,
        viewbox: true,
        blurradius: 0,
        blurdelta: 20
      };

      if (settings.mode === 'color') {
        options.colorsampling = 2;
      } else if (settings.mode === 'silhouette' || settings.mode === 'bw') {
        options.colorsampling = 0;
      } else if (settings.mode === 'outline') {
        options.strokewidth = 1;
        options.linefilter = true;
      }

      ImageTracer.imageToSVG(
        imageSrc,
        (svgString: string) => {
          setResultSvg(svgString);
          
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgString, 'image/svg+xml');
          const paths = Array.from(doc.querySelectorAll('path')).map((p, index) => ({
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
