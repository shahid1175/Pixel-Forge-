import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, RefreshCw, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import heic2any from 'heic2any';
import confetti from 'canvas-confetti';

const FORMATS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export default function Converter({ initialFormat }: { initialFormat?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [targetType, setTargetType] = useState(initialFormat || 'image/png');
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      setConvertedBlob(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'image/*': [],
      '.heic': ['.heic'],
      '.heif': ['.heif']
    },
    multiple: false
  } as any);

  const convert = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      let sourceBlob: Blob = file;

      if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        const result = await heic2any({ blob: file, toType: 'image/jpeg' });
        sourceBlob = Array.isArray(result) ? result[0] : result;
      }

      if (targetType === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target?.result as string;
          img.onload = () => {
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">
              <image href="${img.src}" width="${img.width}" height="${img.height}" />
            </svg>`;
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            setConvertedBlob(blob);
            setIsProcessing(false);
            confetti({ particleCount: 50 });
          };
        };
        reader.readAsDataURL(sourceBlob);
        return;
      }

      const img = new Image();
      img.src = URL.createObjectURL(sourceBlob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (targetType === 'image/jpeg') {
          ctx!.fillStyle = '#FFFFFF';
          ctx!.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          setConvertedBlob(blob);
          setIsProcessing(false);
          confetti({ particleCount: 80, spread: 60 });
        }, targetType, 0.95);
      };
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto">
      {!file ? (
        <div {...getRootProps()} className={cn(
          "border-3 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer border-slate-200 hover:border-emerald-300 hover:bg-slate-50",
          isDragActive && "border-emerald-500 bg-emerald-50"
        )}>
          <input {...getInputProps()} />
          <RefreshCw className="w-10 h-10 text-emerald-600" />
          <div className="text-center">
            <p className="text-lg font-bold">Universal Format Converter</p>
            <p className="text-slate-500">Supports PNG, JPG, WebP, and HEIC (iPhone)</p>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
             <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 w-full md:w-auto">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-[10px] uppercase font-bold text-slate-400">Source File</p>
                   <p className="font-bold truncate max-w-[150px]">{file.name}</p>
                </div>
             </div>

             <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center rotate-90 md:rotate-0">
                <RefreshCw className={cn("w-5 h-5", isProcessing && "animate-spin")} />
             </div>

             <div className="bg-white p-4 rounded-3xl border-2 border-emerald-500 shadow-xl w-full md:w-auto min-w-[200px]">
                <p className="text-[10px] uppercase font-bold text-emerald-600 mb-2 px-2">Convert To</p>
                <div className="flex flex-col gap-1">
                   {FORMATS.map(f => (
                     <button 
                       key={f}
                       onClick={() => setTargetType(f)}
                       className={cn(
                         "text-left px-3 py-2 rounded-xl text-sm font-bold transition-all",
                         targetType === f ? "bg-emerald-600 text-white" : "hover:bg-slate-50"
                       )}
                     >
                       {f.replace('image/', '').toUpperCase()}
                     </button>
                   ))}
                </div>
             </div>
          </div>

          <div className="flex flex-col items-center gap-4">
             <button 
               onClick={convert}
               disabled={isProcessing}
               className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl shadow-slate-200"
             >
               {isProcessing ? 'Converting...' : 'Start Conversion'}
             </button>

             {convertedBlob && (
               <button 
                 onClick={() => {
                   const a = document.createElement('a');
                   a.href = URL.createObjectURL(convertedBlob);
                   a.download = `pixelbox_${file.name.split('.')[0]}.${targetType.split('/')[1]}`;
                   a.click();
                 }}
                 className="flex items-center gap-2 text-emerald-600 font-bold hover:underline"
               >
                 <Download className="w-4 h-4" /> Download Now
               </button>
             )}
          </div>
          
          <div className="pt-8 border-t border-slate-100 flex justify-center gap-8 text-slate-400 text-xs">
             <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> No Uploads</span>
             <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Batch Ready</span>
             <span className="flex items-center gap-1 text-indigo-500"><Download className="w-3 h-3" /> Direct Save</span>
          </div>
        </div>
      )}
    </div>
  );
}
