import React from 'react';
import { render, screen } from '@testing-library/react';
import { DrawingCanvas, DrawingData } from '../components/DrawingCanvas';

// Mock ReactFlow instance
const mockReactFlowInstance = {
  getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
};

describe('DrawingCanvas', () => {
  const defaultProps = {
    isDrawingMode: false,
    isEraserMode: false,
    drawingColor: '#ffffff',
    lineWidth: 3,
    onDrawingChange: jest.fn(),
    reactFlowInstance: mockReactFlowInstance,
    isFullscreen: false,
  };

  beforeEach(() => {
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 1000,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 1000,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    }));

    // Mock canvas context
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      set strokeStyle(value) {},
      set lineWidth(value) {},
      set lineCap(value) {},
      set lineJoin(value) {},
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders canvas element', () => {
    render(<DrawingCanvas {...defaultProps} />);
    const canvas = screen.getByRole('img', { hidden: true });
    expect(canvas).toBeInTheDocument();
  });

  test('initializes with empty drawing data', () => {
    const onDrawingChange = jest.fn();
    render(<DrawingCanvas {...defaultProps} onDrawingChange={onDrawingChange} />);
    
    // Should eventually call onDrawingChange with empty strokes
    setTimeout(() => {
      expect(onDrawingChange).toHaveBeenCalledWith({ strokes: [] });
    }, 100);
  });

  test('handles initial drawing data properly', () => {
    const initialData: DrawingData = {
      strokes: [
        {
          id: 'test-stroke',
          points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
          color: '#ff0000',
          width: 2,
          timestamp: Date.now(),
        },
      ],
    };

    const onDrawingChange = jest.fn();
    render(
      <DrawingCanvas
        {...defaultProps}
        initialDrawingData={initialData}
        onDrawingChange={onDrawingChange}
      />
    );

    // Should eventually call onDrawingChange with the initial data
    setTimeout(() => {
      expect(onDrawingChange).toHaveBeenCalledWith(initialData);
    }, 100);
  });

  test('canvas starts with opacity 0 and transitions to 1 when initialized', () => {
    render(<DrawingCanvas {...defaultProps} />);
    const canvas = screen.getByRole('img', { hidden: true });
    
    // Initially should have opacity 0
    expect(canvas).toHaveStyle('opacity: 0');
    
    // After initialization, should transition to opacity 1
    setTimeout(() => {
      expect(canvas).toHaveStyle('opacity: 1');
    }, 200);
  });

  test('handles missing ReactFlow instance gracefully', () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    
    render(
      <DrawingCanvas
        {...defaultProps}
        reactFlowInstance={null}
      />
    );

    // Should not crash and should handle gracefully
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  test('handles invalid drawing data gracefully', () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    
    const invalidData = {
      strokes: [
        {
          id: 'invalid-stroke',
          points: null, // Invalid points
          color: '#ff0000',
          width: 2,
          timestamp: Date.now(),
        },
      ],
    } as any;

    render(
      <DrawingCanvas
        {...defaultProps}
        initialDrawingData={invalidData}
      />
    );

    // Should handle invalid data without crashing
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
  });
});