import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Trash2, Eraser, MousePointer2 } from 'lucide-react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

export default function BackgroundRemover() {
  const [image, setImage] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState(30);
  const [targetColor, setTargetColor] = useState<{ r: number, g: number, b: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
      setTargetColor(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const pickColor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    setTargetColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
  };

  useEffect(() => {
    if (!image || !targetColor || !canvasRef.current || !resultCanvasRef.current) return;

    const process = () => {
      const source = canvasRef.current!;
      const result = resultCanvasRef.current!;
      const sCtx = source.getContext('2d', { willReadFrequently: true })!;
      const rCtx = result.getContext('2d')!;

      result.width = source.width;
      result.height = source.height;

      const imageData = sCtx.getImageData(0, 0, source.width, source.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const diff = Math.sqrt(
          Math.pow(r - targetColor.r, 2) +
          Math.pow(g - targetColor.g, 2) +
          Math.pow(b - targetColor.b, 2)
        );

        if (diff < tolerance) {
          data[i + 3] = 0; // Transparent
        }
      }

      rCtx.putImageData(imageData, 0, 0);
    };

    process();
  }, [image, targetColor, tolerance]);

  useEffect(() => {
    if (image && canvasRef.current) {
        const img = new Image();
        img.src = image;
        img.onload = () => {
            const canvas = canvasRef.current!;
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
        };
    }
  }, [image]);

  const download = (format: 'image/png' | 'image/jpeg') => {
    if (!resultCanvasRef.current) return;
    
    let url;
    let extension = format === 'image/png' ? 'png' : 'jpg';

    if (format === 'image/jpeg') {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = resultCanvasRef.current.width;
      tempCanvas.height = resultCanvasRef.current.height;
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(resultCanvasRef.current, 0, 0);
      url = tempCanvas.toDataURL('image/jpeg', 0.9);
    } else {
      url = resultCanvasRef.current.toDataURL('image/png');
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = `cleansed-image.${extension}`;
    a.click();
    confetti({ particleCount: 50 });
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-8">
      {!image ? (
        <div {...getRootProps()} className={cn(
          "border-3 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer border-slate-200 hover:border-indigo-300 hover:bg-slate-50",
          isDragActive && "border-indigo-500 bg-indigo-50"
        )}>
          <input {...getInputProps()} />
          <Eraser className="w-10 h-10 text-indigo-600" />
          <p className="font-bold">Chroma Key Background Remover</p>
          <p className="text-sm text-slate-500 text-center max-w-md">Pick a color on your image to make it transparent. Perfect for logos or product photos with solid backgrounds.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                   <MousePointer2 className="w-4 h-4 text-indigo-600" /> 1. Click to select background
                </h3>
                <button onClick={() => setImage(null)} className="text-xs font-bold text-red-500">RESET</button>
             </div>
             <div className="bg-slate-100 rounded-3xl border border-slate-200 overflow-hidden cursor-crosshair">
                <canvas 
                    ref={canvasRef} 
                    onClick={pickColor}
                    className="w-full h-auto block"
                />
             </div>
          </div>

          <div className="space-y-6">
             <div>
                <h3 className="font-bold text-slate-900 mb-4">2. Preview & Adjust</h3>
                <div className="aspect-square bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-slate-200 rounded-3xl border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-inner">
                   <canvas ref={resultCanvasRef} className="max-w-full max-h-full object-contain" />
                   {!targetColor && (
                     <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm p-8 text-center text-slate-500 font-medium">
                        Click on the original image to pick a background color
                     </div>
                   )}
                </div>
             </div>

             {targetColor && (
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                         <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})` }} />
                         <span className="text-xs font-bold text-slate-400">Target Color</span>
                      </div>
                      <div className="text-xs font-bold text-indigo-600">Tolerance: {tolerance}</div>
                   </div>
                   <input 
                      type="range" min="1" max="255" value={tolerance}
                      onChange={(e) => setTolerance(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      title="Adjust sensitivity: Higher tolerance removes colors that are more distant from the selected one."
                   />
                   <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => download('image/png')}
                        className="bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                      >
                        <Download className="w-5 h-5" /> PNG
                      </button>
                      <button 
                        onClick={() => download('image/jpeg')}
                        className="bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-100"
                      >
                        <Download className="w-5 h-5" /> JPG
                      </button>
                   </div>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
