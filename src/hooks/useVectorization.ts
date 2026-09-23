import { useState, useCallback } from 'react';
import * as ImageTracerModule from 'imagetracerjs';
import { AppSettings } from '../App';

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
      // Configuration for ImageTracer
      const options: any = {
        ltres: settings.simplification / 10,
        qtres: settings.simplification / 5,
        pathomit: settings.minShapeSize,
        rightangleenhance: settings.preserveCorners,
        colorsampling: 1, // Default to grayscale/threshold for most CAD tasks
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

      // Adjust based on mode
      if (settings.mode === 'color') {
        options.colorsampling = 2;
      } else if (settings.mode === 'silhouette' || settings.mode === 'bw') {
        options.colorsampling = 0; // Black and white
      } else if (settings.mode === 'outline') {
        options.strokewidth = 1;
        options.linefilter = true;
      }

      // ImageTracer takes an image URL or HTMLImageElement
      ImageTracer.imageToSVG(
        imageSrc,
        (svgString: string) => {
          setResultSvg(svgString);
          
          // Parse SVG string to get paths for interactive cleanup
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
