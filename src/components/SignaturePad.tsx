import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, PenTool } from 'lucide-react';

interface SignaturePadProps {
  onChange: (signature: string) => void;
  language: 'id' | 'en';
}

export default function SignaturePad({ onChange, language }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Initialize canvas context
  const getContext = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set high pixel density support
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e293b'; // Slate 800
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = getContext();
    if (!ctx) return;

    // Prevent scrolling when drawing on touchscreen
    if (e.cancelable) {
      e.preventDefault();
    }

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveSignature();
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Check if TouchEvent or MouseEvent
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange('');
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <PenTool className="w-4 h-4 text-sky-600" />
          {language === 'id' ? 'Tanda Tangan Digital' : 'Digital Signature'}{' '}
          <span className="text-rose-500">*</span>
        </label>
        <button
          type="button"
          onClick={clear}
          className="text-xs flex items-center gap-1 text-slate-500 hover:text-rose-600 py-1 px-2.5 rounded-lg hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {language === 'id' ? 'Bersihkan' : 'Clear'}
        </button>
      </div>

      <div className="relative border border-slate-300 rounded-xl bg-slate-50 overflow-hidden shadow-inner flex items-center justify-center">
        <span className="absolute pointer-events-none select-none text-slate-300 font-display font-medium text-lg tracking-wider">
          {language === 'id' ? 'Tanda tangan di sini' : 'Sign here'}
        </span>
        <canvas
          ref={canvasRef}
          width={500}
          height={180}
          className="signature-canvas w-full max-w-full h-[180px] bg-transparent cursor-crosshair relative z-10"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <p className="text-[11px] text-slate-400 italic">
        {language === 'id'
          ? 'Gunakan Mouse, Touchscreen, atau Stylus untuk menandatangani kotak di atas.'
          : 'Use Mouse, Touchscreen, or Stylus to sign in the box above.'}
      </p>
    </div>
  );
}
