// src/utils/imageProcessing.ts

export interface PreprocessingOptions {
  brightness: number;         // -100 to 100
  contrast: number;           // -100 to 100
  grayscale: boolean;
  invert: boolean;
  removeBackground: boolean;
  bgSensitivity: number;      // 0 to 100 (threshold percentage)
}

export function processImageFilters(
  sourceImage: string,
  options: PreprocessingOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceImage);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const totalPixels = canvas.width * canvas.height;

      // 1. Estimate paper background color from corners
      const corners = [
        0,                                   // Top-Left
        (canvas.width - 1) * 4,              // Top-Right
        ((canvas.height - 1) * canvas.width) * 4, // Bottom-Left
        (totalPixels - 1) * 4                // Bottom-Right
      ];

      let avgBgR = 0, avgBgG = 0, avgBgB = 0;
      for (const c of corners) {
        avgBgR += data[c];
        avgBgG += data[c + 1];
        avgBgB += data[c + 2];
      }
      avgBgR /= 4;
      avgBgG /= 4;
      avgBgB /= 4;

      const bgThreshold = 255 * (1 - options.bgSensitivity / 100);

      // Contrast factor calculation
      const contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness
        if (options.brightness !== 0) {
          r = Math.min(255, Math.max(0, r + options.brightness * 1.5));
          g = Math.min(255, Math.max(0, g + options.brightness * 1.5));
          b = Math.min(255, Math.max(0, b + options.brightness * 1.5));
        }

        // Contrast
        if (options.contrast !== 0) {
          r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
          g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
          b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));
        }

        // Grayscale
        if (options.grayscale) {
          const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          r = lum;
          g = lum;
          b = lum;
        }

        // Invert
        if (options.invert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        // Remove Background (Transparent Alpha)
        if (options.removeBackground) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          // Calculate distance from paper color or luminance threshold
          if (lum > bgThreshold) {
            // Smooth alpha falloff near the threshold boundary
            const fade = Math.min(1, Math.max(0, (255 - lum) / Math.max(1, 255 - bgThreshold)));
            data[i + 3] = Math.round(fade * 255);
          }
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = sourceImage;
  });
}
