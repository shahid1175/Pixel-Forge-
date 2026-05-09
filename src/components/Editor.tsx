import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Sun, Contrast, Droplets, Wind, Palette, Layers, CircleDashed, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

interface Filter {
  name: string;
  property: string;
  unit: string;
  min: number;
  max: number;
  default: number;
  icon: React.ReactNode;
}

const FILTERS: Filter[] = [
  { name: 'Brightness', property: 'brightness', unit: '%', min: 0, max: 200, default: 100, icon: <Sun className="w-4 h-4" /> },
  { name: 'Contrast', property: 'contrast', unit: '%', min: 0, max: 200, default: 100, icon: <Contrast className="w-4 h-4" /> },
  { name: 'Saturation', property: 'saturate', unit: '%', min: 0, max: 200, default: 100, icon: <Droplets className="w-4 h-4" /> },
  { name: 'Hue', property: 'hue-rotate', unit: 'deg', min: 0, max: 360, default: 0, icon: <Palette className="w-4 h-4" /> },
  { name: 'Blur', property: 'blur', unit: 'px', min: 0, max: 20, default: 0, icon: <Wind className="w-4 h-4" /> },
  { name: 'Sharpen', property: 'sharpen', unit: '', min: 0, max: 100, default: 0, icon: <Wand2 className="w-4 h-4" /> },
  { name: 'Grayscale', property: 'grayscale', unit: '%', min: 0, max: 100, default: 0, icon: <div className="w-4 h-4 rounded-full bg-slate-400" /> },
  { name: 'Sepia', property: 'sepia', unit: '%', min: 0, max: 100, default: 0, icon: <div className="w-4 h-4 rounded-full bg-orange-200" /> },
  { name: 'Invert', property: 'invert', unit: '%', min: 0, max: 100, default: 0, icon: <RefreshCw className="w-4 h-4" /> },
  { name: 'Vignette', property: 'vignette', unit: '%', min: 0, max: 100, default: 0, icon: <CircleDashed className="w-4 h-4" /> }
];

const PRESETS = [
  { name: 'Normal', values: {} },
  { name: 'Vintage', values: { sepia: 50, contrast: 110, brightness: 110 } },
  { name: 'B&W', values: { grayscale: 100, contrast: 120 } },
  { name: 'Dramatic', values: { contrast: 150, saturate: 120, vignette: 40 } },
  { name: 'Warm', values: { sepia: 30, saturate: 120, brightness: 105 } },
  { name: 'Cold', values: { 'hue-rotate': 180, saturate: 80, brightness: 105 } }
];

export default function Editor() {
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [values, setValues] = useState<Record<string, number>>(
    FILTERS.reduce((acc, f) => ({ ...acc, [f.property]: f.default }), {})
  );
  const [isProcessing, setIsProcessing] = useState(false);
  
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      const img = new Image();
      img.src = URL.createObjectURL(selected);
      img.onload = () => {
        setImage(img);
      };
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const getFilterString = () => {
    return FILTERS
      .filter(f => f.property !== 'sharpen' && f.property !== 'vignette')
      .map(f => `${f.property}(${values[f.property]}${f.unit})`)
      .join(' ');
  };

  const getSharpenKernel = () => {
    const s = values.sharpen / 20;
    return `0 -1 0 -1 ${5 + s} -1 0 -1 0`;
  };

  const updatePreview = useCallback(() => {
    if (!previewCanvasRef.current || !image) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use a fixed or relative size for display to keep it smooth
    const maxWidth = 1200;
    const scale = Math.min(1, maxWidth / image.width);
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply SVG sharpen if needed via CSS filter on canvas context
    ctx.filter = `${getFilterString()} ${values.sharpen > 0 ? 'url(#sharpen)' : ''}`;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Apply Vignette overlay
    if (values.vignette > 0) {
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2)) / 2
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, `rgba(0,0,0,${values.vignette / 100})`);
      ctx.fillStyle = gradient;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset filter for vignette
      ctx.filter = 'none'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [image, values]);

  useEffect(() => {
    const raf = requestAnimationFrame(updatePreview);
    return () => cancelAnimationFrame(raf);
  }, [updatePreview]);

  const saveImage = async () => {
    if (!image) return;
    setIsProcessing(true);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;

    ctx.filter = `${getFilterString()} ${values.sharpen > 0 ? 'url(#sharpen)' : ''}`;
    ctx.drawImage(image, 0, 0);

    if (values.vignette > 0) {
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2)) / 2
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, `rgba(0,0,0,${values.vignette / 100})`);
      ctx.fillStyle = gradient;
      ctx.filter = 'none';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `edited_${file?.name || 'image.png'}`;
    a.click();
    confetti({ particleCount: 60 });
    setIsProcessing(false);
  };

  const applyPreset = (presetValues: Record<string, number>) => {
    const newValues = FILTERS.reduce((acc, f) => ({ 
      ...acc, 
      [f.property]: presetValues[f.property] !== undefined ? presetValues[f.property] : f.default 
    }), {});
    setValues(newValues);
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto">
      <svg className="hidden">
        <filter id="sharpen">
          <feConvolveMatrix order="3" kernelMatrix={getSharpenKernel()} />
        </filter>
      </svg>

      {!file ? (
        <div {...getRootProps()} className={cn(
          "border-3 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer border-slate-200 hover:border-indigo-300 hover:bg-slate-50",
          isDragActive && "border-indigo-500 bg-indigo-50"
        )}>
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 text-indigo-600" />
          <p className="font-bold">Drop photo to edit</p>
          <p className="text-sm text-slate-500">Apply filters and basic adjustments</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 relative aspect-video flex items-center justify-center shadow-inner">
                <canvas 
                  ref={previewCanvasRef}
                  className="max-w-full max-h-full object-contain shadow-2xl"
                />
                {!image && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>}
             </div>

             <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Quick Presets
                </h4>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset.values)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
             </div>

             <div className="flex justify-between items-center px-2">
                <span className="text-xs font-mono text-slate-400">High Resolution Canvas Rendering</span>
                <button 
                  onClick={() => { setFile(null); setImage(null); }}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  Clear Image
                </button>
             </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl flex flex-col gap-6 h-[700px]">
             <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2 italic">
                  <Layers className="w-4 h-4 text-indigo-600" /> Adjustments
                </h3>
                <button 
                  onClick={() => setValues(FILTERS.reduce((acc, f) => ({ ...acc, [f.property]: f.default }), {}))} 
                  className="text-xs text-indigo-600 font-bold hover:underline"
                >
                  Reset All
                </button>
             </div>

             <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {FILTERS.map((f) => (
                  <div key={f.property} className="space-y-2 group">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                        {f.icon} {f.name}
                      </div>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {values[f.property]}{f.unit}
                      </span>
                    </div>
                    <input 
                      type="range"
                      min={f.min}
                      max={f.max}
                      value={values[f.property]}
                      onInput={(e) => {
                        const val = parseInt((e.target as HTMLInputElement).value);
                        setValues(prev => ({ ...prev, [f.property]: val }));
                      }}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                ))}
             </div>

             <button 
               onClick={saveImage}
               disabled={isProcessing || !image}
               className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-100/50"
             >
               <Download className="w-5 h-5" /> {isProcessing ? 'Processing...' : 'Download High Quality'}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
