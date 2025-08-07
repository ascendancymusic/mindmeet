import { DrawingData, DrawingStroke } from '../components/DrawingCanvas';

interface CompressedStroke {
  i: string; // id
  p: [number, number][]; // points (x, y tuples)
  c: string; // color
  w: number; // width
  t: number; // timestamp
}

interface CompressedDrawingData {
  s: CompressedStroke[]; // strokes
  v: number; // version for future compatibility
}

/**
 * Compresses drawing data by:
 * 1. Using shorter property names
 * 2. Converting points to tuples instead of objects
 * 3. Minimal coordinate rounding to preserve accuracy
 */
export function compressDrawingData(data: DrawingData | null | undefined): string | null {
  if (!data || !data.strokes || data.strokes.length === 0) {
    return null;
  }

  const compressed: CompressedDrawingData = {
    v: 1,
    s: data.strokes.map(stroke => ({
      i: stroke.id,
      p: stroke.points.map(point => [
        Math.round(point.x * 1000) / 1000, // Round to 3 decimal places for better precision
        Math.round(point.y * 1000) / 1000
      ]),
      c: stroke.color,
      w: stroke.width,
      t: stroke.timestamp
    }))
  };

  try {
    return JSON.stringify(compressed);
  } catch (error) {
    console.error('Error compressing drawing data:', error);
    return null;
  }
}

/**
 * Decompresses drawing data back to the original format
 */
export function decompressDrawingData(compressedData: string | null | undefined): DrawingData | null {
  if (!compressedData) {
    return null;
  }

  try {
    const parsed = JSON.parse(compressedData) as CompressedDrawingData;
    
    // Handle legacy format (uncompressed data) gracefully
    if (!parsed.v && (parsed as any).strokes) {
      return parsed as any as DrawingData;
    }

    const decompressed: DrawingData = {
      strokes: parsed.s?.map(stroke => ({
        id: stroke.i,
        points: stroke.p.map(([x, y]) => ({ x, y })),
        color: stroke.c,
        width: stroke.w,
        timestamp: stroke.t
      })) || []
    };

    return decompressed;
  } catch (error) {
    console.error('Error decompressing drawing data:', error);
    return null;
  }
}

/**
 * Optimizes stroke data by removing redundant points that are very close together
 * Uses a much more conservative approach to preserve drawing accuracy
 */
export function optimizeStroke(stroke: DrawingStroke, tolerance: number = 0.5): DrawingStroke {
  if (stroke.points.length <= 2) return stroke;

  const optimizedPoints = [stroke.points[0]]; // Always keep the first point
  
  for (let i = 1; i < stroke.points.length - 1; i++) {
    const prev = optimizedPoints[optimizedPoints.length - 1]; // Use the last kept point
    const current = stroke.points[i];
    
    // Calculate distance from current point to previous kept point
    const distance = Math.sqrt(
      Math.pow(current.x - prev.x, 2) + Math.pow(current.y - prev.y, 2)
    );
    
    // Keep point if it's far enough from the last kept point
    // This preserves the shape much better than line simplification
    if (distance > tolerance) {
      optimizedPoints.push(current);
    }
  }
  
  // Always keep the last point
  if (stroke.points.length > 1) {
    optimizedPoints.push(stroke.points[stroke.points.length - 1]);
  }
  
  return {
    ...stroke,
    points: optimizedPoints
  };
}

/**
 * Optimizes drawing data by removing very close redundant points from all strokes
 * Uses a conservative approach to maintain drawing accuracy
 */
export function optimizeDrawingData(data: DrawingData, tolerance: number = 0.5): DrawingData {
  return {
    strokes: data.strokes.map(stroke => optimizeStroke(stroke, tolerance))
  };
}
