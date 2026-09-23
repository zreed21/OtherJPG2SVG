// src/utils/centerlineTracer.ts

export interface CenterlineOptions {
  threshold: number;             // 0 - 255 fallback global threshold
  autoThreshold?: boolean;       // Otsu's thresholding
  adaptiveLighting: boolean;     // Adaptive thresholding to remove phone shadows/gradients
  adaptiveSensitivity: number;   // 5 - 40 margin below local mean
  invert: boolean;               // Invert ink/background
  lineWidth: number;             // Uniform stroke width in px
  strokeColor: string;           // e.g. "#1e293b" or "#000000"
  fillBackground?: string;       // e.g. "none", "#ffffff"
  lineCap: 'round' | 'square' | 'butt';
  lineJoin: 'round' | 'bevel' | 'miter';
  connectGaps: boolean;          // Connect broken lines and snap close endpoints
  gapMaxDistance: number;        // Max pixel gap to bridge (5 - 50 px)
  autoCloseLoops: boolean;       // Snap start and end together into closed loops
  humanErrorSmoothing: number;   // 0 (raw) to 10 (ultra-smooth organic curve)
  minPathLength: number;         // Filter out tiny specks/dust marks (e.g. 5 to 30 px)
}

interface Point {
  x: number;
  y: number;
}

interface PolylinePath {
  points: Point[];
  isClosed: boolean;
}

export function computeOtsuThreshold(grayPixels: Uint8Array): number {
  const histogram = new Array(256).fill(0);
  const total = grayPixels.length;

  for (let i = 0; i < total; i++) {
    histogram[grayPixels[i]]++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

function adaptiveThreshold(
  gray: Uint8Array,
  width: number,
  height: number,
  sensitivity: number,
  invert: boolean
): Uint8Array {
  const total = width * height;
  const binary = new Uint8Array(total);
  const radius = Math.max(12, Math.round(Math.min(width, height) / 30));

  const integral = new Float64Array((width + 1) * (height + 1));
  const intW = width + 1;

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    const yOffset = y * width;
    const intYOffset = (y + 1) * intW;
    const prevIntYOffset = y * intW;

    for (let x = 0; x < width; x++) {
      rowSum += gray[yOffset + x];
      integral[intYOffset + (x + 1)] = integral[prevIntYOffset + (x + 1)] + rowSum;
    }
  }

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    const yOffset = y * width;

    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);

      const count = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * intW + (x1 + 1)] -
        integral[y0 * intW + (x1 + 1)] -
        integral[(y1 + 1) * intW + x0] +
        integral[y0 * intW + x0];

      const mean = sum / count;
      const pixelVal = gray[yOffset + x];

      const isInk = invert
        ? pixelVal > mean + sensitivity
        : pixelVal < mean - sensitivity;

      binary[yOffset + x] = isInk ? 1 : 0;
    }
  }

  return binary;
}

function zhangSuenThinning(grid: Uint8Array, width: number, height: number): Uint8Array {
  const result = new Uint8Array(grid);
  let changed = true;

  while (changed) {
    changed = false;

    // Sub-iteration 1
    const toDelete1: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width;
      const prevRow = (y - 1) * width;
      const nextRow = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const idx = rowOffset + x;
        if (result[idx] === 0) continue;

        const p2 = result[prevRow + x];
        const p3 = result[prevRow + (x + 1)];
        const p4 = result[rowOffset + (x + 1)];
        const p5 = result[nextRow + (x + 1)];
        const p6 = result[nextRow + x];
        const p7 = result[nextRow + (x - 1)];
        const p8 = result[rowOffset + (x - 1)];
        const p9 = result[prevRow + (x - 1)];

        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;

        const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let a = 0;
        for (let i = 0; i < 8; i++) {
          if (neighbors[i] === 0 && neighbors[i + 1] === 1) a++;
        }
        if (a !== 1) continue;

        if (p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0) {
          toDelete1.push(idx);
        }
      }
    }
    for (let i = 0; i < toDelete1.length; i++) {
      result[toDelete1[i]] = 0;
      changed = true;
    }

    // Sub-iteration 2
    const toDelete2: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width;
      const prevRow = (y - 1) * width;
      const nextRow = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const idx = rowOffset + x;
        if (result[idx] === 0) continue;

        const p2 = result[prevRow + x];
        const p3 = result[prevRow + (x + 1)];
        const p4 = result[rowOffset + (x + 1)];
        const p5 = result[nextRow + (x + 1)];
        const p6 = result[nextRow + x];
        const p7 = result[nextRow + (x - 1)];
        const p8 = result[rowOffset + (x - 1)];
        const p9 = result[prevRow + (x - 1)];

        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;

        const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let a = 0;
        for (let i = 0; i < 8; i++) {
          if (neighbors[i] === 0 && neighbors[i + 1] === 1) a++;
        }
        if (a !== 1) continue;

        if (p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) {
          toDelete2.push(idx);
        }
      }
    }
    for (let i = 0; i < toDelete2.length; i++) {
      result[toDelete2[i]] = 0;
      changed = true;
    }
  }

  return result;
}

function ptDist(p1: Point, p2: Point): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function connectAndBridgeLines(
  polylines: Point[][],
  maxGapDist: number,
  autoClose: boolean
): PolylinePath[] {
  if (polylines.length === 0) return [];

  let pool: PolylinePath[] = polylines.map((p) => ({ points: [...p], isClosed: false }));
  let changed = true;

  while (changed) {
    changed = false;

    if (autoClose) {
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (p.isClosed || p.points.length < 4) continue;

        const start = p.points[0];
        const end = p.points[p.points.length - 1];
        if (ptDist(start, end) <= maxGapDist) {
          p.isClosed = true;
          changed = true;
        }
      }
    }

    for (let i = 0; i < pool.length; i++) {
      if (pool[i].isClosed) continue;
      const pA = pool[i].points;
      const startA = pA[0];
      const endA = pA[pA.length - 1];

      for (let j = i + 1; j < pool.length; j++) {
        if (pool[j].isClosed) continue;
        const pB = pool[j].points;
        const startB = pB[0];
        const endB = pB[pB.length - 1];

        if (ptDist(endA, startB) <= maxGapDist) {
          pool[i].points = pA.concat(pB);
          pool.splice(j, 1);
          changed = true;
          break;
        } else if (ptDist(endA, endB) <= maxGapDist) {
          pool[i].points = pA.concat(pB.slice().reverse());
          pool.splice(j, 1);
          changed = true;
          break;
        } else if (ptDist(startA, endB) <= maxGapDist) {
          pool[i].points = pB.concat(pA);
          pool.splice(j, 1);
          changed = true;
          break;
        } else if (ptDist(startA, startB) <= maxGapDist) {
          pool[i].points = pB.slice().reverse().concat(pA);
          pool.splice(j, 1);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  return pool;
}

function perpendicularDistance(p: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - lineStart.x, p.y - lineStart.y);
  return Math.abs(dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / (Math.hypot(dx, dy) || 1);
}

function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, index + 1), epsilon);
    const right = rdpSimplify(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    return [start, end];
  }
}

function smoothAndFairPath(points: Point[], isClosed: boolean, smoothLevel: number): Point[] {
  if (points.length < 3) return points;
  if (smoothLevel <= 0.1) return points;

  let pts = points.map((p) => ({ ...p }));

  const laplacianPasses = Math.min(20, Math.round(smoothLevel * 2.5));
  const relaxFactor = Math.min(0.7, 0.25 + smoothLevel * 0.05);

  for (let pass = 0; pass < laplacianPasses; pass++) {
    const next: Point[] = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      if (!isClosed && (i === 0 || i === n - 1)) {
        next.push(pts[i]);
        continue;
      }
      const prev = isClosed ? pts[(i - 1 + n) % n] : pts[i - 1];
      const succ = isClosed ? pts[(i + 1) % n] : pts[i + 1];

      const avgX = (prev.x + succ.x) / 2;
      const avgY = (prev.y + succ.y) / 2;

      next.push({
        x: pts[i].x * (1 - relaxFactor) + avgX * relaxFactor,
        y: pts[i].y * (1 - relaxFactor) + avgY * relaxFactor,
      });
    }
    pts = next;
  }

  const chaikinIters = smoothLevel >= 6 ? 2 : smoothLevel >= 2.5 ? 1 : 0;
  for (let it = 0; it < chaikinIters; it++) {
    const refined: Point[] = [];
    const len = pts.length;
    if (isClosed) {
      for (let i = 0; i < len; i++) {
        const p0 = pts[i];
        const p1 = pts[(i + 1) % len];
        refined.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y });
        refined.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y });
      }
    } else {
      refined.push(pts[0]);
      for (let i = 0; i < len - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        refined.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y });
        refined.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y });
      }
      refined.push(pts[len - 1]);
    }
    pts = refined;
  }

  return pts;
}

function pathToSmoothSvg(points: Point[], isClosed: boolean): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  const n = points.length;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  if (isClosed) {
    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const p3 = points[(i + 2) % n];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    d += ' Z';
  } else {
    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < n - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
  }

  return d;
}

export interface TraceResult {
  svg: string;
  paths: { d: string; isClosed: boolean }[];
  pathsCount: number;
  pointsCount: number;
  width: number;
  height: number;
  thresholdUsed: number;
}

export function traceCenterlines(
  imageData: ImageData,
  options: CenterlineOptions
): TraceResult {
  const { width, height, data } = imageData;
  const totalPixels = width * height;

  const gray = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }

  let binary: Uint8Array;
  let effectiveThreshold = options.threshold;

  if (options.adaptiveLighting) {
    binary = adaptiveThreshold(gray, width, height, options.adaptiveSensitivity, options.invert);
  } else {
    if (options.autoThreshold) {
      effectiveThreshold = computeOtsuThreshold(gray);
    }
    binary = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const isInk = options.invert ? gray[i] > effectiveThreshold : gray[i] < effectiveThreshold;
      binary[i] = isInk ? 1 : 0;
    }
  }

  const skeleton = zhangSuenThinning(binary, width, height);

  const visited = new Uint8Array(totalPixels);
  const rawPolylines: Point[][] = [];

  const getUnvisitedNeighbors = (x: number, y: number) => {
    const list: Point[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = ny * width + nx;
          if (skeleton[idx] === 1 && !visited[idx]) {
            list.push({ x: nx, y: ny });
          }
        }
      }
    }
    return list;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (skeleton[idx] === 0 || visited[idx]) continue;

      const polyline: Point[] = [{ x, y }];
      visited[idx] = 1;
      let curr = { x, y };

      while (true) {
        const nextNeighbors = getUnvisitedNeighbors(curr.x, curr.y);
        if (nextNeighbors.length === 0) break;

        const next = nextNeighbors[0];
        visited[next.y * width + next.x] = 1;
        polyline.push(next);
        curr = next;
      }

      if (polyline.length >= options.minPathLength) {
        rawPolylines.push(polyline);
      }
    }
  }

  let paths: PolylinePath[];
  if (options.connectGaps) {
    paths = connectAndBridgeLines(rawPolylines, options.gapMaxDistance, options.autoCloseLoops);
  } else {
    paths = rawPolylines.map((pts) => ({ points: pts, isClosed: false }));
  }

  const finalSvgPathStrings: { d: string; isClosed: boolean }[] = [];
  let totalPoints = 0;

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    if (path.points.length < 2) continue;

    const rdpEpsilon = 1.0 + options.humanErrorSmoothing * 0.4;
    const simplified = rdpSimplify(path.points, rdpEpsilon);
    const smoothed = smoothAndFairPath(simplified, path.isClosed, options.humanErrorSmoothing);

    totalPoints += smoothed.length;
    const d = pathToSmoothSvg(smoothed, path.isClosed);
    finalSvgPathStrings.push({ d, isClosed: path.isClosed });
  }

  const pathElements = finalSvgPathStrings
    .map(
      (p) =>
        `  <path d="${p.d}" fill="none" stroke="${options.strokeColor}" stroke-width="${options.lineWidth}" stroke-linecap="${options.lineCap}" stroke-linejoin="${options.lineJoin}" />`
    )
    .join('\n');

  const bgRect =
    options.fillBackground && options.fillBackground !== 'none'
      ? `  <rect width="${width}" height="${height}" fill="${options.fillBackground}" />\n`
      : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n${bgRect}${pathElements}\n</svg>`;

  return {
    svg,
    paths: finalSvgPathStrings,
    pathsCount: finalSvgPathStrings.length,
    pointsCount: totalPoints,
    width,
    height,
    thresholdUsed: effectiveThreshold,
  };
}
