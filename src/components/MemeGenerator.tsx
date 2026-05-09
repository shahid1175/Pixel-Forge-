import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Type, Layout, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

export default function MemeGenerator() {
  const [image, setImage] = useState<string | null>(null);
  const [topText, setTopText] = useState('TOP TEXT');
  const [bottomText, setBottomText] = useState('BOTTOM TEXT');
  const [fontSize, setFontSize] = useState(40);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) setImage(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const generateMeme = () => {
    if (!image) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = image;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const fSize = (canvas.width / 10) * (fontSize / 40);
      ctx.font = `bold ${fSize}px Impact, sans-serif`;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = fSize / 15;
      ctx.textAlign = 'center';

      // Top Text
      ctx.textBaseline = 'top';
      ctx.fillText(topText.toUpperCase(), canvas.width / 2, 20);
      ctx.strokeText(topText.toUpperCase(), canvas.width / 2, 20);

      // Bottom Text
      ctx.textBaseline = 'bottom';
      ctx.fillText(bottomText.toUpperCase(), canvas.width / 2, canvas.height - 20);
      ctx.strokeText(bottomText.toUpperCase(), canvas.width / 2, canvas.height - 20);

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'meme.png';
      a.click();
      
      confetti({ particleCount: 100, spread: 70 });
      setIsProcessing(false);
    };
  };

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto">
      {!image ? (
        <div {...getRootProps()} className={cn(
          "border-3 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer border-slate-200 hover:border-rose-300 hover:bg-slate-50",
          isDragActive && "border-rose-500 bg-rose-50"
        )}>
          <input {...getInputProps()} />
          <Layout className="w-10 h-10 text-rose-600" />
          <p className="font-bold">Select image for your meme</p>
          <p className="text-sm text-slate-500">Classic layout: Top text, bottom text, high impact.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
             <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-square bg-black">
                <img src={image} className="w-full h-full object-contain" alt="Meme base" />
                <div className="absolute inset-x-0 top-4 text-center px-4">
                   <h2 className="text-white font-black uppercase tracking-tight break-words drop-shadow-[0_2px_2px_rgba(0,0,0,1)]" style={{ fontSize: fontSize }}>{topText}</h2>
                </div>
                <div className="absolute inset-x-0 bottom-4 text-center px-4">
                   <h2 className="text-white font-black uppercase tracking-tight break-words drop-shadow-[0_2px_2px_rgba(0,0,0,1)]" style={{ fontSize: fontSize }}>{bottomText}</h2>
                </div>
             </div>
             <div className="flex justify-between items-center px-4">
                <span className="text-xs text-slate-400 font-mono italic">Impact font simulated</span>
                <button onClick={() => setImage(null)} className="text-xs font-bold text-red-500">Change Image</button>
             </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-8 flex flex-col">
             <div className="space-y-4 flex-1">
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Text</label>
                   <input 
                     type="text" 
                     value={topText}
                     onChange={(e) => setTopText(e.target.value)}
                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-rose-500 transition-all font-bold text-xl uppercase"
                     title="Caption appearing at the top of the meme."
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bottom Text</label>
                   <input 
                     type="text" 
                     value={bottomText}
                     onChange={(e) => setBottomText(e.target.value)}
                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-rose-500 transition-all font-bold text-xl uppercase"
                     title="Caption appearing at the bottom of the meme."
                   />
                </div>

                <div className="space-y-1 pt-4">
                   <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                      <span>Font Size</span>
                      <span>{fontSize}px</span>
                   </div>
                   <input 
                     type="range" min="10" max="100" step="1" value={fontSize}
                     onChange={(e) => setFontSize(parseInt(e.target.value))}
                     className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
                     title="Adjust the size of the meme text."
                   />
                </div>
             </div>

             <button 
               onClick={generateMeme}
               disabled={isProcessing}
               className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 flex items-center justify-center gap-3 uppercase italic tracking-tighter"
             >
               <Download className="w-6 h-6" /> {isProcessing ? 'Generating...' : 'Download Meme'}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
