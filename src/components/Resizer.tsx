import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Trash2, Maximize, Lock, Unlock } from 'lucide-react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

export default function Resizer() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [originalDims, setOriginalDims] = useState({ width: 0, height: 0 });
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreview(url);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setDimensions({ width: img.width, height: img.height });
        setOriginalDims({ width: img.width, height: img.height });
      };
      setResizedBlob(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const handleResize = (axis: 'width' | 'height', value: number) => {
    if (aspectRatioLocked && originalDims.width > 0) {
      const ratio = originalDims.height / originalDims.width;
      if (axis === 'width') {
        setDimensions({ width: value, height: Math.round(value * ratio) });
      } else {
        setDimensions({ width: Math.round(value / ratio), height: value });
      }
    } else {
      setDimensions(prev => ({ ...prev, [axis]: value }));
    }
  };

  const processResize = async () => {
    if (!file) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      
      ctx?.drawImage(img, 0, 0, dimensions.width, dimensions.height);
      
      canvas.toBlob(
        (blob) => {
          setResizedBlob(blob);
          setIsProcessing(false);
          confetti({ particleCount: 50 });
        },
        file.type,
        0.92
      );
    };
  };

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto">
      {!file ? (
        <div {...getRootProps()} className={cn(
          "border-3 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer border-slate-200 hover:border-purple-300 hover:bg-slate-50",
          isDragActive && "border-purple-500 bg-purple-50"
        )}>
          <input {...getInputProps()} />
          <Maximize className="w-10 h-10 text-purple-600" />
          <div className="text-center">
            <p className="text-lg font-bold">Resize your image</p>
            <p className="text-slate-500">Drop your file to get started</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="font-bold flex items-center gap-2">Dimensions</h3>
              <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                <div className="grid grid-cols-2 gap-4 relative">
                  <div className="space-y-1">
                    <label className="text-xs uppercase font-bold text-slate-500">Width (px)</label>
                    <input 
                      type="number" 
                      value={dimensions.width}
                      onChange={(e) => handleResize('width', parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-2 ring-purple-500 outline-none transition-all"
                      title="Specify the desired width of the image in pixels."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase font-bold text-slate-500">Height (px)</label>
                    <input 
                      type="number" 
                      value={dimensions.height}
                      onChange={(e) => handleResize('height', parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-2 ring-purple-500 outline-none transition-all"
                      title="Specify the desired height of the image in pixels."
                    />
                  </div>
                  
                  <button 
                    onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                    title={aspectRatioLocked ? "Lock aspect ratio: maintains proportions" : "Unlock aspect ratio: allow free distortion"}
                    className={cn(
                      "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-px p-1.5 rounded-full z-10 transition-all",
                      aspectRatioLocked ? "bg-purple-600 text-white shadow-md shadow-purple-200" : "bg-slate-200 text-slate-500"
                    )}
                  >
                    {aspectRatioLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex gap-2">
                   {[100, 75, 50, 25].map(p => (
                     <button 
                        key={p}
                        onClick={() => handleResize('width', Math.round(originalDims.width * (p/100)))}
                        className="flex-1 bg-white border border-slate-200 py-2 rounded-lg text-xs font-bold hover:bg-purple-50 hover:border-purple-200 transition-all"
                        title={`Resize image to ${p}% of its original scale.`}
                     >
                        {p}%
                     </button>
                   ))}
                </div>

                <button 
                  onClick={processResize}
                  disabled={isProcessing}
                  className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
                >
                  {isProcessing ? 'Resizing...' : 'Apply Resize'}
                </button>
              </div>

              {resizedBlob && (
                <button 
                   onClick={() => {
                     const url = URL.createObjectURL(resizedBlob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = `resized_${file.name}`;
                     document.body.appendChild(a);
                     a.click();
                     document.body.removeChild(a);
                   }}
                   className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                   <Download className="w-5 h-5" /> Download Result
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Visual Guide</h3>
                <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="bg-slate-100 rounded-3xl aspect-square border border-slate-200 relative group overflow-hidden flex items-center justify-center p-8">
                 <div 
                   className="bg-white shadow-xl rounded border-2 border-purple-500/20 transition-all duration-300 ease-out"
                   style={{ 
                     width: `${Math.min(100, (dimensions.width / originalDims.width) * 100)}%`,
                     aspectRatio: `${dimensions.width} / ${dimensions.height}`
                   }}
                 >
           <img 
             src={preview || ''} 
             className="w-full h-full object-cover opacity-80" 
             alt="Guide" 
           />
                 </div>
                 <div className="absolute bottom-4 left-4 right-4 bg-slate-900/10 backdrop-blur-sm rounded-full py-1 text-center text-[10px] font-mono text-slate-600">
                    {dimensions.width} x {dimensions.height} px
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
