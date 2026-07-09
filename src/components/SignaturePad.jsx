import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser } from 'lucide-react';

/**
 * Campo de assinatura desenhada (canvas), otimizado para toque em celular.
 *
 * Props:
 * - value: string (data URI base64 PNG) | ''
 * - onChange: (dataUri: string) => void   -> chamado com '' quando limpo
 */
function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [hasStroke, setHasStroke] = useState(!!value);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  }, []);

  // Ajusta o canvas pra resolução real do dispositivo (evita traço borrado em telas retina)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = 160 * ratio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = '160px';
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, 160);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = getContext();
    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    if (!hasStroke) setHasStroke(true);
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    onChange?.(canvas.toDataURL('image/png'));
  };

  const limpar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = containerRef.current.getBoundingClientRect();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, 160);
    setHasStroke(false);
    onChange?.('');
  };

  return (
    <div ref={containerRef} className="w-full">
      <div className="relative rounded-md border border-white/10 overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          className="w-full block cursor-crosshair touch-none"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {!hasStroke && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            Assine aqui com o dedo ou mouse
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={limpar}
        className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
      >
        <Eraser className="h-3.5 w-3.5" />
        Limpar assinatura
      </button>
    </div>
  );
}

export default SignaturePad;
