"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Type,
  Trash2,
  Download,
  Undo2,
  Redo2,
  X,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';

type Tool =
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text';

interface WhiteboardStageProps {
  initialData?: string;
  onSave?: (dataUrl: string) => void;
  onBroadcast?: (dataUrl: string) => void;
  onClose: () => void;
}

export function WhiteboardStage({
  initialData,
  onSave,
  onBroadcast,
  onClose,
}: WhiteboardStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#3b82f6');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  // Undo / Redo history stacks
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const snapshotRef = useRef<ImageData | null>(null);

  const colors = [
    '#ffffff',
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // yellow
    '#8b5cf6', // purple
    '#06b6d4', // cyan
  ];

  // Save state to undo history
  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(data);
    historyIndexRef.current++;
  }, []);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 600;

    canvas.width = width;
    canvas.height = height;

    // Fill canvas with sleek dark backdrop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    if (initialData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        pushHistory();
      };
      img.src = initialData;
    } else {
      pushHistory();
    }
  }, [initialData, pushHistory]);

  const undo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
        onSave?.(canvas.toDataURL());
      }
    }
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
        onSave?.(canvas.toDataURL());
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (tool === 'text') {
      const text = prompt('Enter text to place on whiteboard:');
      if (text) {
        ctx.fillStyle = color;
        ctx.font = `${lineWidth * 5 + 14}px sans-serif`;
        ctx.fillText(text, x, y);
        pushHistory();
        onSave?.(canvas.toDataURL());
        onBroadcast?.(canvas.toDataURL());
      }
      setIsDrawing(false);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'highlighter') {
      ctx.strokeStyle = color + '44'; // 25% opacity
      ctx.lineWidth = lineWidth * 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = lineWidth * 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (snapshotRef.current) {
      // Shapes preview: restore original snapshot and draw dynamic shape
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      if (tool === 'rectangle') {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2)
        );
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (tool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(y - startPos.y, x - startPos.x);
        const headlen = 14;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
          x - headlen * Math.cos(angle - Math.PI / 6),
          y - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x, y);
        ctx.lineTo(
          x - headlen * Math.cos(angle + Math.PI / 6),
          y - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
    setStartPos(null);
    pushHistory();

    if (canvas) {
      const dataUrl = canvas.toDataURL();
      onSave?.(dataUrl);
      onBroadcast?.(dataUrl);
    }
  };

  const clearCanvas = () => {
    if (!confirm('Clear all drawings on the whiteboard?')) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      pushHistory();
      onSave?.(canvas.toDataURL());
      onBroadcast?.(canvas.toDataURL());
      toast.success('Whiteboard cleared');
    }
  };

  const downloadWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `Zoom_Whiteboard_${Date.now()}.png`;
    link.click();
    toast.success('Whiteboard image downloaded!');
  };

  return (
    <div className="absolute inset-0 z-40 bg-gray-950 flex flex-col">
      {/* Top Floating Whiteboard Toolbar */}
      <div className="h-14 bg-gray-900 border-b border-white/10 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {/* Tools */}
          <Button
            size="sm"
            variant={tool === 'pen' ? 'default' : 'ghost'}
            onClick={() => setTool('pen')}
            className={`h-9 px-3 text-xs gap-1.5 ${tool === 'pen' ? 'bg-blue-600' : 'text-gray-300 hover:text-white'}`}
          >
            <Pen className="w-4 h-4" />
            Pen
          </Button>

          <Button
            size="sm"
            variant={tool === 'highlighter' ? 'default' : 'ghost'}
            onClick={() => setTool('highlighter')}
            className={`h-9 px-3 text-xs gap-1.5 ${tool === 'highlighter' ? 'bg-blue-600' : 'text-gray-300 hover:text-white'}`}
          >
            <Highlighter className="w-4 h-4" />
            Highlighter
          </Button>

          <Button
            size="sm"
            variant={tool === 'eraser' ? 'default' : 'ghost'}
            onClick={() => setTool('eraser')}
            className={`h-9 px-3 text-xs gap-1.5 ${tool === 'eraser' ? 'bg-blue-600' : 'text-gray-300 hover:text-white'}`}
          >
            <Eraser className="w-4 h-4" />
            Eraser
          </Button>

          <div className="h-5 w-px bg-white/10 mx-1" />

          {/* Shapes */}
          <Button
            size="sm"
            variant={tool === 'rectangle' ? 'default' : 'ghost'}
            onClick={() => setTool('rectangle')}
            className={`h-9 w-9 p-0 ${tool === 'rectangle' ? 'bg-blue-600' : 'text-gray-300 hover:text-white'}`}
            title="Rectangle"
          >
            <Square className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant={tool === 'circle' ? 'default' : 'ghost'}
            onClick={() => setTool('circle')}
            className={`h-9 w-9 p-0 ${tool === 'circle' ? 'bg-blue-600' : 'text-gray-300 hover:text-white'}`}
            title="Circle"
          >
            <Circle className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant={tool === 'line' ? 'default' : 'ghost'}
            onClick={() => setTool('line')}
            className={`h-9 w-9 p-0 ${tool === 'line' ? 'bg-blue-600' : 'text-gray-300 hover:text-white'}`}
            title="Line"
          >
            <Minus className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant={tool === 'arrow' ? 'default' : 'ghost'}
            onClick={() => setTool('arrow')}
            className={`h-9 w-9 p-0 ${tool === 'arrow' ? 'bg-blue-600' : 'text-gray-300 hover:text-white'}`}
            title="Arrow"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant={tool === 'text' ? 'default' : 'ghost'}
            onClick={() => setTool('text')}
            className={`h-9 w-9 p-0 ${tool === 'text' ? 'bg-blue-600' : 'text-gray-300 hover:text-white'}`}
            title="Text tool"
          >
            <Type className="w-4 h-4" />
          </Button>

          <div className="h-5 w-px bg-white/10 mx-1" />

          {/* Color Palette */}
          <div className="flex items-center gap-1">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-white shadow-sm' : 'hover:scale-110 opacity-80'
                }`}
              />
            ))}
          </div>

          <div className="h-5 w-px bg-white/10 mx-1" />

          {/* Line Width */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="text-[10px]">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              className="w-16 h-1 accent-blue-500 bg-gray-700 cursor-pointer"
            />
          </div>
        </div>

        {/* Right Actions: Undo, Redo, Clear, Download, Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={undo}
            className="h-8 w-8 text-gray-300 hover:text-white hover:bg-white/10 rounded-full"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={redo}
            className="h-8 w-8 text-gray-300 hover:text-white hover:bg-white/10 rounded-full"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={clearCanvas}
            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full"
            title="Clear all"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={downloadWhiteboard}
            className="h-8 w-8 text-gray-300 hover:text-white hover:bg-white/10 rounded-full"
            title="Download PNG"
          >
            <Download className="w-4 h-4" />
          </Button>

          <div className="h-5 w-px bg-white/10 mx-1" />

          <Button
            size="sm"
            onClick={onClose}
            className="h-8 bg-white/10 hover:bg-white/20 text-white text-xs gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Close Whiteboard
          </Button>
        </div>
      </div>

      {/* Main Canvas Body */}
      <div ref={containerRef} className="flex-1 relative cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full touch-none"
        />
      </div>
    </div>
  );
}
