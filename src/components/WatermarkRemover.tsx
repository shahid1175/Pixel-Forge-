import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Trash2, Eraser, Move, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

interface Point {
  x: number;
  y: number;
}

export default function WatermarkRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selection, setSelection] = useState<{ start: Point; end: Point } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const containerRef = useRef<HTMLDivElement>(null);

  const [renderTrigger, setRenderTrigger] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      const img = new Image();
      img.src = URL.createObjectURL(selected);
      img.onload = () => {
        setImage(img);
        setSelection(null);
        
        // Initialize buffer canvas
        const buffer = bufferCanvasRef.current;
        buffer.width = img.width;
        buffer.height = img.height;
        const bCtx = buffer.getContext('2d');
        bCtx?.drawImage(img, 0, 0);
        setRenderTrigger(prev => prev + 1);
      };
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const buffer = bufferCanvasRef.current;
      canvas.width = buffer.width;
      canvas.height = buffer.height;
      
      ctx.drawImage(buffer, 0, 0);

      if (selection) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(2, image.width / 400); // Scale line width
        ctx.setLineDash([image.width / 100, image.width / 200]);
        const width = selection.end.x - selection.start.x;
        const height = selection.end.y - selection.start.y;
        ctx.strokeRect(selection.start.x, selection.start.y, width, height);
        
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(selection.start.x, selection.start.y, width, height);
      }
    }
  }, [image, selection, renderTrigger]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Scale factor between actual canvas resolution and displayed size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!image) return;
    if ('cancelable' in e && e.cancelable) e.preventDefault();
    const point = getCanvasCoords(e);
    setSelection({ start: point, end: point });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !selection) return;
    const point = getCanvasCoords(e);
    setSelection({ ...selection, end: point });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const removeWatermark = async () => {
    if (!selection) return;
    setIsProcessing(true);

    const buffer = bufferCanvasRef.current;
    const bCtx = buffer.getContext('2d');
    if (!bCtx) return;

    const startX = Math.min(selection.start.x, selection.end.x);
    const startY = Math.min(selection.start.y, selection.end.y);
    const width = Math.abs(selection.end.x - selection.start.x);
    const height = Math.abs(selection.end.y - selection.start.y);

    if (width < 2 || height < 2) {
      setIsProcessing(false);
      return;
    }

    // Sophisticated Inpainting Implementation:
    // 1. Identify the boundaries
    // 2. Sample from a wider surrounding region
    // 3. Multi-pass interpolation with directional weighting and texture synthesis jitter
    
    // Scale padding based on image resolution
    const padding = Math.max(15, Math.floor(buffer.width / 40));

    // Create a temporary mask/source buffer
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = width + padding * 2;
    sourceCanvas.height = height + padding * 2;
    const sCtx = sourceCanvas.getContext('2d');
    if (!sCtx) return;

    // Draw the surrounding source area onto the temp canvas
    sCtx.drawImage(
      buffer,
      Math.max(0, startX - padding), Math.max(0, startY - padding), width + padding * 2, height + padding * 2,
      0, 0, width + padding * 2, height + padding * 2
    );

    const imageData = sCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const data = imageData.data;
    const targetX = padding;
    const targetY = padding;
    const targetW = width;
    const targetH = height;

    // Helper to get pixel at x,y from source
    const getPixel = (x: number, y: number) => {
      const sx = Math.min(Math.max(0, Math.floor(x)), sourceCanvas.width - 1);
      const sy = Math.min(Math.max(0, Math.floor(y)), sourceCanvas.height - 1);
      const idx = (sy * sourceCanvas.width + sx) * 4;
      return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
    };

    const resultImageData = bCtx.getImageData(startX, startY, width, height);
    const resultData = resultImageData.data;

    // Pass 1: Coarse Filling & Directional Sampling
    // Increase number of directions to 16 for smoother gradients
    const directions = [];
    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        directions.push([Math.cos(angle), Math.sin(angle)]);
    }

    const tempResult = new Uint8ClampedArray(targetW * targetH * 4);

    for (let py = 0; py < targetH; py++) {
      for (let px = 0; px < targetW; px++) {
        let r = 0, g = 0, b = 0, a = 0, weightSum = 0;
        
        directions.forEach(([dx, dy]) => {
          let sx = targetX + px;
          let sy = targetY + py;
          let dist = 0;
          const maxSearch = padding * 1.8;

          while (dist < maxSearch) {
            sx += dx;
            sy += dy;
            dist++;
            
            if (sx < targetX || sx >= targetX + targetW || sy < targetY || sy >= targetY + targetH) {
              if (sx >= 0 && sx < sourceCanvas.width && sy >= 0 && sy < sourceCanvas.height) {
                const [sr, sg, sb, sa] = getPixel(sx, sy);
                // Inverse distance squared weighting for sharper transitions where intended
                const w = 1 / (dist * dist + 1);
                r += sr * w;
                g += sg * w;
                b += sb * w;
                a += sa * w;
                weightSum += w;
              }
              break;
            }
          }
        });

        if (weightSum > 0) {
          const idx = (py * targetW + px) * 4;
          tempResult[idx] = r / weightSum;
          tempResult[idx+1] = g / weightSum;
          tempResult[idx+2] = b / weightSum;
          tempResult[idx+3] = a / weightSum;
        }
      }
    }

    // Pass 2: Texture Refinement (Simple Patch-based jitter)
    for (let py = 0; py < targetH; py++) {
      for (let px = 0; px < targetW; px++) {
        const idx = (py * targetW + px) * 4;
        
        // Sample nearby "pure" pixel outside target to get realistic texture noise
        const angle = Math.random() * Math.PI * 2;
        const dist = padding * (0.5 + Math.random() * 0.5);
        const sx = targetX + px + Math.cos(angle) * dist;
        const sy = targetY + py + Math.sin(angle) * dist;
        
        if (sx >= 0 && sx < sourceCanvas.width && sy >= 0 && sy < sourceCanvas.height && 
            (sx < targetX || sx >= targetX + targetW || sy < targetY || sy >= targetY + targetH)) {
            const [tr, tg, tb] = getPixel(sx, sy);
            
            // Blend the coarse average with a tiny bit of local texture detail
            const textureWeight = 0.15;
            resultData[idx] = tempResult[idx] * (1 - textureWeight) + tr * textureWeight;
            resultData[idx + 1] = tempResult[idx+1] * (1 - textureWeight) + tg * textureWeight;
            resultData[idx + 2] = tempResult[idx+2] * (1 - textureWeight) + tb * textureWeight;
            resultData[idx + 3] = tempResult[idx+3];
        } else {
            resultData[idx] = tempResult[idx];
            resultData[idx + 1] = tempResult[idx + 1];
            resultData[idx + 2] = tempResult[idx + 2];
            resultData[idx + 3] = tempResult[idx + 3];
        }
      }
    }

    // Put modulated data back
    bCtx.putImageData(resultImageData, startX, startY);

    // Final multi-pass blending for edges with varying radii
    bCtx.save();
    bCtx.beginPath();
    bCtx.rect(startX - 1, startY - 1, width + 2, height + 2);
    bCtx.clip();
    
    // 5 blending passes for extreme smoothness
    for (let i = 0; i < 5; i++) {
      bCtx.globalAlpha = 0.25;
      bCtx.filter = `blur(${1.5 + i * 1.2}px) contrast(105%)`;
      bCtx.drawImage(buffer, 0, 0);
    }
    bCtx.restore();

    setTimeout(() => {
      setSelection(null);
      setIsProcessing(false);
      setRenderTrigger(prev => prev + 1);
      confetti({ 
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 }
      });
    }, 600);
  };

  const reset = () => {
    setFile(null);
    setImage(null);
    setSelection(null);
    const buffer = bufferCanvasRef.current;
    buffer.width = 0;
    buffer.height = 0;
    setRenderTrigger(0);
  };

  const download = () => {
    const buffer = bufferCanvasRef.current;
    if (!buffer) return;
    const url = buffer.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleansed_${file?.name || 'image.png'}`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
          Watermark <span className="text-red-500">Remover</span>
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Draw a box over the watermark or object you'd like to remove. 
          Uses local pixel interpolation to blend the background.
        </p>
      </div>

      {!file ? (
        <div 
          {...getRootProps()} 
          className={cn(
            "border-4 border-dashed rounded-3xl p-20 text-center transition-all cursor-pointer",
            isDragActive ? "border-red-500 bg-red-50 scale-95" : "border-slate-200 hover:border-red-400 hover:bg-slate-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="bg-red-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-100">
            <Eraser className="w-10 h-10 text-white" />
          </div>
          <p className="text-xl font-bold text-slate-700">Drop your image here</p>
          <p className="text-slate-400 mt-2">Any format, up to 10MB</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <div 
              ref={containerRef}
              className="bg-slate-900 rounded-3xl overflow-hidden relative cursor-crosshair flex items-center justify-center min-h-[400px] touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <canvas 
                ref={canvasRef}
                className="max-w-full h-auto shadow-2xl"
              />
              {!selection && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[2px]">
                   <div className="bg-white/90 px-6 py-3 rounded-full flex items-center gap-3 shadow-xl">
                      <Move className="w-5 h-5 text-red-500" />
                      <span className="font-bold text-slate-800">Draw a box over the watermark</span>
                   </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center px-2">
              <span className="text-xs font-mono text-slate-400">Content-Aware Inpainting Preview</span>
              <button 
                onClick={reset}
                className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Start Over
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Eraser className="w-5 h-5 text-red-500" /> Remove Tool
              </h3>
              
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-amber-800 text-xs leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <p>For best results, select an area slightly larger than the watermark. Performance depends on image complexity.</p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={removeWatermark}
                  disabled={!selection || isProcessing}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    !selection 
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                        : "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-100"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Eraser className="w-5 h-5" /> Erase Selected
                    </>
                  )}
                </button>

                <button 
                  onClick={download}
                  className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-100"
                >
                  <Download className="w-5 h-5" /> Download Image
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl">
                <h4 className="font-bold text-sm mb-2">Instructions</h4>
                <ol className="text-xs text-slate-500 space-y-2 list-decimal ml-4">
                    <li>Click and drag on the image to select the watermark.</li>
                    <li>Adjust selection if needed by dragging again.</li>
                    <li>Hit "Erase Selected" to process.</li>
                    <li>You can repeat multiple times for stubborn marks.</li>
                </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
