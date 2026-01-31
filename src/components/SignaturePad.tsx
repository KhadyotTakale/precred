import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  id: string;
  onChange?: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
}

export function SignaturePad({ id, onChange, width = 400, height = 150 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      isDrawingMode: true,
    });

    // Create and set the brush explicitly
    const brush = new PencilBrush(canvas);
    brush.color = '#000000';
    brush.width = 2;
    canvas.freeDrawingBrush = brush;

    fabricCanvasRef.current = canvas;
    setIsReady(true);

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [width, height]);

  useEffect(() => {
    if (!isReady || !fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const handlePathCreated = () => {
      const dataUrl = canvas.toDataURL({ multiplier: 1, format: 'png' });
      onChange?.(dataUrl);
    };

    canvas.on('path:created', handlePathCreated);

    return () => {
      canvas.off('path:created', handlePathCreated);
    };
  }, [isReady, onChange]);

  const handleClear = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    onChange?.(null);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-hidden bg-white">
        <canvas ref={canvasRef} className="max-w-full touch-none" />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Draw your signature above</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="h-7 text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}
