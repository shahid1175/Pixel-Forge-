import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Trash2, Sliders, Zap } from 'lucide-react';
import { cn, formatBytes } from '../lib/utils';
import confetti from 'canvas-confetti';

export default function Compressor() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [quality, setQuality] = useState(0.7);
  const [targetFormat, setTargetFormat] = useState<'image/jpeg' | 'image/webp'>('image/jpeg');
  const [isAutoOptimizing, setIsAutoOptimizing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setCompressedBlob(null);
      setIsAutoOptimizing(false);
      // Default to webp if supported, or jpeg
      setTargetFormat('image/jpeg');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const compressAtQuality = (img: HTMLImageElement, q: number, type: string): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => resolve(blob), type, q);
    });
  };

  const autoOptimize = async () => {
    if (!file) return;
    setIsAutoOptimizing(true);
    setIsProcessing(true);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    await new Promise((resolve) => { img.onload = resolve; });

    // Target: 40% of original size or minimum quality 0.3
    let bestBlob: Blob | null = null;
    let bestQuality = 0.7;
    const targetSize = file.size * 0.4;

    // Fast iterative search
    const qualities = [0.8, 0.6, 0.4, 0.2];
    for (const q of qualities) {
      const blob = await compressAtQuality(img, q, targetFormat);
      if (blob) {
        bestBlob = blob;
        bestQuality = q;
        if (blob.size <= targetSize) break;
      }
    }

    setQuality(bestQuality);
    setCompressedBlob(bestBlob);
    setIsProcessing(false);
    setIsAutoOptimizing(false);
    confetti({ particleCount: 150, spread: 100 });
  };

  const compressImage = async () => {
    if (!file) return;
    setIsProcessing(true);
    setIsAutoOptimizing(false);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = async () => {
      const blob = await compressAtQuality(img, quality, targetFormat);
      setCompressedBlob(blob);
      setIsProcessing(false);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    };
  };

  const handleDownload = () => {
    if (!compressedBlob) return;
    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed_${file?.name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto">
      {!file ? (
        <div 
          {...getRootProps()} 
          className={cn(
            "border-3 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer",
            isDragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Upload className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">Drag & drop your image here</p>
            <p className="text-slate-500">or click to browse files (JPG, PNG, WebP)</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Compression Settings
              </h3>
              <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Target Format</label>
                  <div className="flex gap-2">
                    {['image/jpeg', 'image/webp'].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setTargetFormat(fmt as any)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-xs font-bold border transition-all",
                          targetFormat === fmt 
                            ? "bg-indigo-600 border-indigo-600 text-white" 
                            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                        )}
                      >
                        {fmt.split('/')[1].toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium">Quality ({Math.round(quality * 100)}%)</label>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1" 
                    step="0.05" 
                    value={quality} 
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    title="Lower quality significantly reduces file size. Higher quality preserves more detail but results in a larger file."
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    onClick={compressImage}
                    disabled={isProcessing}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isProcessing && !isAutoOptimizing ? 'Processing...' : 'Compress Now'}
                  </button>
                  <button 
                    onClick={autoOptimize}
                    disabled={isProcessing}
                    className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    title="Automatically find the best balance between quality and file size."
                  >
                    <Zap className={cn("w-4 h-4", isAutoOptimizing && "animate-pulse")} />
                    {isAutoOptimizing ? 'Optimizing...' : 'Auto Opt'}
                  </button>
                </div>
              </div>

              {compressedBlob && (
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Original Size:</span>
                    <span className="font-bold">{formatBytes(file.size)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Compressed Size:</span>
                    <span className="font-bold text-emerald-600">{formatBytes(compressedBlob.size)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-emerald-100 pt-3 font-bold">
                    <span className="text-emerald-700">Storage Saved:</span>
                    <span className="text-emerald-700">{Math.round((1 - (compressedBlob.size / file.size)) * 100)}%</span>
                  </div>
                  <button 
                    onClick={handleDownload}
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" /> Download Compressed
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Preview</h3>
                <button 
                  onClick={() => { setFile(null); setCompressedBlob(null); }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="aspect-square bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 relative">
                {preview && <img src={preview} className="w-full h-full object-contain" alt="Preview" />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
