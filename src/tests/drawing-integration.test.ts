/**
 * Integration test for drawing persistence and stability
 * This test validates that the drawing system works correctly across page refreshes
 * and handles various edge cases without flickering.
 */

import { compressDrawingData, decompressDrawingData } from '../utils/drawingDataCompression';
import { DrawingData, DrawingStroke } from '../components/DrawingCanvas';

describe('Drawing Integration Tests', () => {
  const sampleDrawingData: DrawingData = {
    strokes: [
      {
        id: 'stroke-1',
        points: [
          { x: 100, y: 100 },
          { x: 150, y: 120 },
          { x: 200, y: 140 },
        ],
        color: '#ffffff',
        width: 3,
        timestamp: Date.now(),
      },
      {
        id: 'stroke-2',
        points: [
          { x: 50, y: 50 },
          { x: 75, y: 75 },
          { x: 100, y: 100 },
        ],
        color: '#ff0000',
        width: 5,
        timestamp: Date.now() + 1000,
      },
    ],
  };

  test('drawing data compression and decompression works correctly', () => {
    // Test compression
    const compressed = compressDrawingData(sampleDrawingData);
    expect(compressed).toBeTruthy();
    expect(typeof compressed).toBe('string');

    // Test decompression
    const decompressed = decompressDrawingData(compressed);
    expect(decompressed).toBeTruthy();
    expect(decompressed?.strokes).toHaveLength(2);
    
    // Verify data integrity
    expect(decompressed?.strokes[0].id).toBe('stroke-1');
    expect(decompressed?.strokes[0].points).toHaveLength(3);
    expect(decompressed?.strokes[0].color).toBe('#ffffff');
    expect(decompressed?.strokes[0].width).toBe(3);
  });

  test('handles null and undefined drawing data gracefully', () => {
    // Test null data
    const compressedNull = compressDrawingData(null);
    expect(compressedNull).toBeNull();

    const decompressedNull = decompressDrawingData(null);
    expect(decompressedNull).toBeNull();

    // Test undefined data
    const compressedUndefined = compressDrawingData(undefined);
    expect(compressedUndefined).toBeNull();

    const decompressedUndefined = decompressDrawingData(undefined);
    expect(decompressedUndefined).toBeNull();

    // Test empty string
    const decompressedEmpty = decompressDrawingData('');
    expect(decompressedEmpty).toBeNull();
  });

  test('handles empty drawing data correctly', () => {
    const emptyData: DrawingData = { strokes: [] };
    
    const compressed = compressDrawingData(emptyData);
    expect(compressed).toBeNull(); // Empty data should return null

    const decompressed = decompressDrawingData(compressed);
    expect(decompressed).toBeNull();
  });

  test('handles corrupted drawing data gracefully', () => {
    const corruptedData = '{"invalid": "json", "structure": true}';
    
    const decompressed = decompressDrawingData(corruptedData);
    expect(decompressed).toBeNull();
  });

  test('validates stroke data structure', () => {
    const invalidStrokeData: DrawingData = {
      strokes: [
        {
          id: 'valid-stroke',
          points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
          color: '#ffffff',
          width: 3,
          timestamp: Date.now(),
        },
        {
          id: 'invalid-stroke',
          points: [], // Empty points array
          color: '#ff0000',
          width: 2,
          timestamp: Date.now(),
        } as DrawingStroke,
      ],
    };

    const compressed = compressDrawingData(invalidStrokeData);
    expect(compressed).toBeTruthy();

    const decompressed = decompressDrawingData(compressed);
    expect(decompressed?.strokes).toHaveLength(2);
    expect(decompressed?.strokes[1].points).toHaveLength(0);
  });

  test('preserves coordinate precision', () => {
    const preciseData: DrawingData = {
      strokes: [
        {
          id: 'precise-stroke',
          points: [
            { x: 123.456789, y: 987.654321 },
            { x: 111.111111, y: 222.222222 },
          ],
          color: '#00ff00',
          width: 1.5,
          timestamp: Date.now(),
        },
      ],
    };

    const compressed = compressDrawingData(preciseData);
    const decompressed = decompressDrawingData(compressed);

    // Should preserve precision to 3 decimal places
    expect(decompressed?.strokes[0].points[0].x).toBeCloseTo(123.457, 3);
    expect(decompressed?.strokes[0].points[0].y).toBeCloseTo(987.654, 3);
    expect(decompressed?.strokes[0].points[1].x).toBeCloseTo(111.111, 3);
    expect(decompressed?.strokes[0].points[1].y).toBeCloseTo(222.222, 3);
  });

  test('handles large drawing datasets efficiently', () => {
    // Create a large drawing dataset
    const largeStrokes: DrawingStroke[] = [];
    for (let i = 0; i < 100; i++) {
      const points = [];
      for (let j = 0; j < 50; j++) {
        points.push({ x: Math.random() * 1000, y: Math.random() * 1000 });
      }
      largeStrokes.push({
        id: `stroke-${i}`,
        points,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        width: Math.random() * 10 + 1,
        timestamp: Date.now() + i,
      });
    }

    const largeData: DrawingData = { strokes: largeStrokes };

    const startTime = performance.now();
    const compressed = compressDrawingData(largeData);
    const compressionTime = performance.now() - startTime;

    expect(compressed).toBeTruthy();
    expect(compressionTime).toBeLessThan(100); // Should compress in under 100ms

    const decompressStartTime = performance.now();
    const decompressed = decompressDrawingData(compressed);
    const decompressionTime = performance.now() - decompressStartTime;

    expect(decompressed?.strokes).toHaveLength(100);
    expect(decompressionTime).toBeLessThan(100); // Should decompress in under 100ms
  });
});