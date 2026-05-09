import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Palette, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ColorPicker() {
  const [image, setImage] = useState<string | null>(null);
  const [hex, setHex] = useState('#6366F1');
  const [rgb, setRgb] = useState({ r: 99, g: 102, b: 241 });
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) setImage(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const handlePick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];

    const newHex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    setHex(newHex);
    setRgb({ r, g, b });
  };

  useEffect(() => {
    if (image && canvasRef.current && imgRef.current) {
        const img = imgRef.current;
        img.onload = () => {
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
            
            const maxDim = 800;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = (h / w) * maxDim;
                    w = maxDim;
                } else {
                    w = (w / h) * maxDim;
                    h = maxDim;
                }
            }
            
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
        };
    }
  }, [image]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto">
      {!image ? (
        <div {...getRootProps()} className={cn(
          "border-3 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer border-slate-200 hover:border-pink-300 hover:bg-slate-50",
          isDragActive && "border-pink-500 bg-pink-50"
        )}>
          <input {...getInputProps()} />
          <Palette className="w-10 h-10 text-pink-600" />
          <p className="font-bold">Extract colors from image</p>
          <p className="text-sm text-slate-500">Pick any pixel to get its HEX or RGB code</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">1. Click on the image to pick color</h3>
                <button onClick={() => setImage(null)} className="text-xs font-bold text-slate-400 hover:text-red-500">CHANGE IMAGE</button>
             </div>
             <div className="relative border-4 border-white shadow-2xl rounded-2xl overflow-hidden bg-slate-100 cursor-crosshair group">
                <canvas 
                    ref={canvasRef} 
                    onClick={handlePick}
                    className="w-full h-auto block"
                />
                <img ref={imgRef} src={image} className="hidden" alt="Source" />
             </div>
          </div>

          <div className="space-y-8">
             <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6">
                <div className="space-y-2">
                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Active Color</p>
                   <div 
                      className="w-full h-32 rounded-2xl shadow-inner transition-colors duration-200 ring-4 ring-slate-50"
                      style={{ backgroundColor: hex }}
                   />
                </div>

                <div className="space-y-4">
                   <div className="group relative">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">HEX Code</p>
                      <div className="flex gap-2">
                         <div className="flex-1 font-mono font-bold bg-slate-50 p-3 rounded-xl border border-slate-100 text-lg">
                            {hex}
                         </div>
                         <button 
                            onClick={() => copyToClipboard(hex)}
                            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 transition-all active:scale-95"
                         >
                            {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                         </button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
