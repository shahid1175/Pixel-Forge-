import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Type, Image as ImageIcon, Sliders, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

export default function Watermarker() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState('PixelForge');
  const [opacity, setOpacity] = useState(0.5);
  const [fontSize, setFontSize] = useState(40);
  const [color, setColor] = useState('#ffffff');
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const applyWatermark = () => {
    if (!preview) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = preview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Repeat watermark in a grid
      const stepX = canvas.width / 4;
      const stepY = canvas.height / 4;

      for (let x = stepX / 2; x < canvas.width; x += stepX) {
        for (let y = stepY / 2; y < canvas.height; y += stepY) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-Math.PI / 4);
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore();
        }
      }

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `watermarked_${file?.name || 'image.png'}`;
      a.click();
      
      confetti({ particleCount: 50 });
      setIsProcessing(false);
    };
  };

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto">
      {!file ? (
        <div {...getRootProps()} className={cn(
          "border-3 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer border-slate-200 hover:border-amber-300 hover:bg-slate-50",
          isDragActive && "border-amber-500 bg-amber-50"
        )}>
          <input {...getInputProps()} />
          <ImageIcon className="w-10 h-10 text-amber-600" />
          <p className="font-bold">Select image to watermark</p>
          <p className="text-sm text-slate-500">Add recurring text overlays to protect your images</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-4">
             <div className="bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 aspect-video flex items-center justify-center relative">
                {preview && <img src={preview} className="max-w-full max-h-full object-contain" alt="Preview" />}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 select-none flex flex-wrap justify-around items-center content-around">
                   {Array.from({ length: 16 }).map((_, i) => (
                     <span key={i} className="text-white font-bold transform -rotate-45" style={{ fontSize: fontSize / 2 }}>{watermarkText}</span>
                   ))}
                </div>
             </div>
             <button onClick={() => setFile(null)} className="text-xs font-bold text-red-500 hover:underline">Change Image</button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6">
             <div className="flex items-center gap-2 mb-4">
               <Type className="w-5 h-5 text-amber-600" />
               <h3 className="font-bold">Text Settings</h3>
             </div>
             
             <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-400">Watermark Text</label>
                   <input 
                     type="text" 
                     value={watermarkText}
                     onChange={(e) => setWatermarkText(e.target.value)}
                     className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-amber-500 transition-all font-bold"
                     title="The text that will be repeated across your image as a watermark."
                   />
                </div>

                <div className="space-y-1">
                   <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                      <span>Opacity</span>
                      <span>{Math.round(opacity * 100)}%</span>
                   </div>
                   <input 
                     type="range" min="0.1" max="1" step="0.1" value={opacity}
                     onChange={(e) => setOpacity(parseFloat(e.target.value))}
                     className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-600"
                     title="Control how transparent the watermark should be (lower = more subtle)."
                   />
                </div>

                <div className="space-y-1">
                   <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                      <span>Font Size</span>
                      <span>{fontSize}px</span>
                   </div>
                   <input 
                     type="range" min="10" max="150" step="5" value={fontSize}
                     onChange={(e) => setFontSize(parseInt(e.target.value))}
                     className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-600"
                     title="Adjust the size of the watermark text."
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-400">Watermark Color</label>
                   <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-12 h-12 p-1 bg-white border border-slate-200 rounded-lg cursor-pointer"
                        title="Pick a color for the watermark text."
                      />
                      <input 
                        type="text" 
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-amber-500 transition-all font-mono text-sm"
                      />
                   </div>
                </div>
             </div>

             <button 
               onClick={applyWatermark}
               disabled={isProcessing}
               className="w-full bg-amber-600 text-white py-4 rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
             >
               <Download className="w-5 h-5" /> {isProcessing ? 'Applying...' : 'Download Watermarked'}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
