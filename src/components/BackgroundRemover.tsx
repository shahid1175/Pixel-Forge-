import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Trash2, Eraser, MousePointer2, Sparkles, Loader2, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenerativeAI } from "@google/generative-ai";
import confetti from 'canvas-confetti';

type Mode = 'chroma' | 'ai';

export default function BackgroundRemover() {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>('ai');
  const [tolerance, setTolerance] = useState(30);
  const [targetColor, setTargetColor] = useState<{ r: number, g: number, b: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      const url = URL.createObjectURL(file);
      setImage(url);
      setTargetColor(null);
      setAiResult(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const pickColor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'chroma') return;
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
    });
  };

  const runAiRemoval = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY || '';
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const base64 = await fileToBase64(file);

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { data: base64, mimeType: file.type } },
            { text: "Remove the background from this image. Carefully mask the main subject and place it on a PURE WHITE (#FFFFFF) background. Do not add any text, frames, or extra details. Output only the modified image." }
          ]
        }]
      });
      const response = result.response;

      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData);
      
      if (imagePart?.inlineData) {
        setAiResult(`data:image/png;base64,${imagePart.inlineData.data}`);
        // Automatically switch back to chroma to "clean" the white background
        setMode('chroma');
        setTargetColor({ r: 255, g: 255, b: 255 });
        setTolerance(20);
        confetti({ particleCount: 100, spread: 70 });
      } else {
        throw new Error("AI did not return an image part. It might have refused or failed.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "AI background removal failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const sourceImage = aiResult || image;
    if (!sourceImage || (mode === 'chroma' && !targetColor) || !resultCanvasRef.current) return;

    const img = new Image();
    img.src = sourceImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);

      const result = resultCanvasRef.current!;
      result.width = img.width;
      result.height = img.height;
      const rCtx = result.getContext('2d')!;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      if (mode === 'chroma' && targetColor) {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const diff = Math.sqrt(
            Math.pow(r - targetColor.r, 2) +
            Math.pow(g - targetColor.g, 2) +
            Math.pow(b - targetColor.b, 2)
          );
          if (diff < tolerance) data[i + 3] = 0;
        }
      }

      rCtx.putImageData(imageData, 0, 0);
    };
  }, [image, aiResult, targetColor, tolerance, mode]);

  useEffect(() => {
    const sourceImage = aiResult || image;
    if (sourceImage && canvasRef.current) {
        const img = new Image();
        img.src = sourceImage;
        img.onload = () => {
            const canvas = canvasRef.current!;
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
        };
    }
  }, [image, aiResult]);

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
    a.download = `pixelbox-cleansed.${extension}`;
    a.click();
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-12">
      {!image ? (
        <div {...getRootProps()} className={cn(
          "border-4 border-dashed rounded-[3rem] p-24 flex flex-col items-center justify-center gap-6 transition-all cursor-pointer border-slate-200 hover:border-indigo-400 hover:bg-slate-50",
          isDragActive && "border-indigo-500 bg-indigo-50"
        )}>
          <input {...getInputProps()} />
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-200">
             <Eraser className="w-12 h-12 text-white" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black text-slate-900">AI Background Remover</h3>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
              Drop an image to automatically isolate the subject using Gemini AI or manually pick colors to remove.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                   <button 
                    onClick={() => setMode('ai')}
                    className={cn("px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2", mode === 'ai' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                   >
                     <Sparkles className="w-3.5 h-3.5" /> AI MAGIC
                   </button>
                   <button 
                    onClick={() => setMode('chroma')}
                    className={cn("px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2", mode === 'chroma' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                   >
                     <MousePointer2 className="w-3.5 h-3.5" /> MANUAL
                   </button>
                </div>
                <button onClick={() => { setImage(null); setAiResult(null); }} className="text-xs font-bold text-red-500 hover:underline uppercase tracking-tighter">Reset</button>
             </div>

             <div className="bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl relative">
                <div className={cn("bg-slate-800 rounded-[2rem] overflow-hidden", mode === 'chroma' ? "cursor-crosshair" : "cursor-default")}>
                   <canvas ref={canvasRef} onClick={pickColor} className="w-full h-auto block" />
                </div>
                {mode === 'ai' && !aiResult && (
                  <div className="absolute inset-4 rounded-[2rem] bg-indigo-600/10 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6">
                     <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl">
                        <Zap className="w-10 h-10 text-indigo-600 fill-indigo-600" />
                     </div>
                     <div className="space-y-2">
                        <h4 className="text-white font-black text-xl">Isolate Subject</h4>
                        <p className="text-indigo-100 text-xs max-w-[240px] leading-relaxed">
                          Our AI will analyze the image and separate the foreground automatically.
                        </p>
                     </div>
                     <button 
                        onClick={runAiRemoval}
                        disabled={isProcessing}
                        className="bg-white text-indigo-600 px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                     >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Remove Background Now"}
                     </button>
                  </div>
                )}
             </div>

             {mode === 'chroma' && (
                <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700">
                   <MousePointer2 className="w-4 h-4" />
                   <p className="text-xs font-bold">CLICK ON THE IMAGE ABOVE TO PICK A COLOR TO REMOVE</p>
                </div>
             )}
          </div>

          <div className="space-y-8">
             <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Result Preview</h3>
                <div className="aspect-square bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-slate-200 rounded-[2.5rem] border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-inner group">
                   <canvas ref={resultCanvasRef} className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105" />
                   {!targetColor && mode === 'chroma' && (
                     <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm p-8 text-center text-slate-500 font-bold">
                        Pick a color to see transparency
                     </div>
                   )}
                </div>
             </div>

             {targetColor && (
                <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm space-y-6 animate-in slide-in-from-top-4">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                         <div className="w-6 h-6 rounded-lg border shadow-sm" style={{ backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})` }} />
                         <span className="text-xs font-black text-slate-900 uppercase">Target Color</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full">
                         <Sliders className="w-3 h-3 text-indigo-600" />
                         <span className="text-[10px] font-black text-indigo-600">SENSITIVITY: {tolerance}</span>
                      </div>
                   </div>
                   <input 
                      type="range" min="1" max="255" value={tolerance}
                      onChange={(e) => setTolerance(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                   />
                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => download('image/png')}
                        className="bg-indigo-600 text-white py-5 rounded-2xl font-black hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-100"
                      >
                        <Download className="w-5 h-5" /> PNG (TRANSPARENT)
                      </button>
                      <button 
                        onClick={() => download('image/jpeg')}
                        className="bg-slate-100 text-slate-900 py-5 rounded-2xl font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" /> JPG (WHITE)
                      </button>
                   </div>
                </div>
             )}

             <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Cloud-based processing powered by Google Gemini</span>
             </div>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-md mx-auto p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-start animate-bounce">
           <Trash2 className="w-5 h-5 text-red-500" />
           <div className="space-y-1">
              <p className="text-xs font-black text-red-900 uppercase">Analysis Failed</p>
              <p className="text-xs text-red-600">{error}</p>
           </div>
        </div>
      )}
    </div>
  );
}

function Sliders(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="2" x2="6" y1="14" y2="14" />
      <line x1="10" x2="14" y1="8" y2="8" />
      <line x1="18" x2="22" y1="16" y2="16" />
    </svg>
  );
}

