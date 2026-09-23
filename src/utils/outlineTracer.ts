// src/utils/outlineTracer.ts

export interface OutlineOptions {
  threshold: number;         // 0 - 255
  invert: boolean;
  smoothing: number;         // 0.5 to 5.0
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  minArea: number;           // minimum polygon perimeter to keep
}

interface Point {
  x: number;
  y: number;
}

function simplifyPolygon(points: Point[], epsilon: number): Point[] {
  if (points.length <= 4) return points;
  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const num = Math.abs(dy * points[i].x - dx * points[i].y + end.x * start.y - end.y * start.x);
    const den = Math.hypot(dx, dy) || 1;
    const d = num / den;
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPolygon(points.slice(0, index + 1), epsilon);
    const right = simplifyPolygon(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    return [start, end];
  }
}

function contourToSvgPath(points: Point[]): string {
  if (points.length < 3) return '';
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  d += ' Z';
  return d;
}

export function traceOutlinesFast(
  imageData: ImageData,
  options: OutlineOptions
): { svg: string; paths: { d: string; fill: string; stroke: string; strokeWidth: number }[] } {
  const { width, height, data } = imageData;
  const total = width * height;

  const binary = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    const isForeground = options.invert ? lum > options.threshold : lum < options.threshold;
    binary[i] = isForeground ? 1 : 0;
  }

  const visited = new Uint8Array(width * height);
  const contours: Point[][] = [];

  const DIRS = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: -1, dy: -1 }
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (binary[idx] === 1 && !visited[idx] && binary[idx - 1] === 0) {
        const contour: Point[] = [];
        let currX = x;
        let currY = y;
        let dir = 0;

        let steps = 0;
        const maxSteps = Math.min(20000, width * height);

        while (steps < maxSteps) {
          contour.push({ x: currX, y: currY });
          visited[currY * width + currX] = 1;

          let found = false;
          for (let i = 0; i < 8; i++) {
            const checkDir = (dir + i) % 8;
            const nx = currX + DIRS[checkDir].dx;
            const ny = currY + DIRS[checkDir].dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (binary[ny * width + nx] === 1) {
                currX = nx;
                currY = ny;
                dir = (checkDir + 5) % 8;
                found = true;
                break;
              }
            }
          }

          if (!found || (currX === x && currY === y && contour.length > 2)) {
            break;
          }
          steps++;
        }

        if (contour.length >= options.minArea) {
          const simplified = simplifyPolygon(contour, options.smoothing);
          if (simplified.length >= 3) {
            contours.push(simplified);
          }
        }
      }
    }
  }

  const paths = contours.map((c) => ({
    d: contourToSvgPath(c),
    fill: options.fillColor || 'none',
    stroke: options.strokeColor || '#000000',
    strokeWidth: options.strokeWidth || 1,
  }));

  const svgElements = paths
    .map((p) => `  <path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" />`)
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n${svgElements}\n</svg>`;

  return { svg, paths };
}
