import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, PenTool } from 'lucide-react';
import { Button } from './Button';

export const SignaturePad = ({ onSaveSignature, onClearSignature }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high DPI displays for crisp vector stroke
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#020617'; // slate-950 stroke
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
    setIsConfirmed(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    if (e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.closePath();
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setIsConfirmed(false);
    if (onClearSignature) onClearSignature();
  };

  const handleConfirm = () => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setIsConfirmed(true);
    if (onSaveSignature) onSaveSignature(dataUrl);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-3 space-y-2 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
          Officer Electronic Signature Pad:
        </span>
        {isConfirmed ? (
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 font-mono">
            SIGNATURE APPLIED
          </span>
        ) : !isEmpty ? (
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 font-mono">
            UNSAVED STROKE
          </span>
        ) : (
          <span className="text-[10px] font-mono text-slate-500">UNSIGNED</span>
        )}
      </div>

      {/* Signature Canvas Box */}
      <div className="relative bg-white rounded-md border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden shadow-inner">
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-slate-400 text-xs font-medium italic">
            Sign here using mouse, finger, or stylus...
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={450}
          height={110}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          className="w-full h-[110px] touch-none cursor-crosshair block"
        />
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleClear}
          disabled={isEmpty}
          icon={RotateCcw}
        >
          Clear
        </Button>

        <Button
          type="button"
          variant={isConfirmed ? "secondary" : "primary"}
          size="sm"
          onClick={handleConfirm}
          disabled={isEmpty}
          icon={Check}
        >
          {isConfirmed ? 'Update Signature' : 'Apply Signature'}
        </Button>
      </div>
    </div>
  );
};
