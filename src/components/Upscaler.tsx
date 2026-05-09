import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Trash2, Maximize2, Sparkles, ShieldAlert, Rocket, Key, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";
import confetti from 'canvas-confetti';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function Upscaler() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('1K');
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      setError(null);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResultImage(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUpscale = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      // Use the selected API key if available, otherwise fallback to default
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const genAI = new GoogleGenAI({ apiKey });
      const base64Data = await fileToBase64(file);

      // Select model based on resolution and key availability
      // gemini-2.5-flash-image is the general model (better for free tier)
      // gemini-3.1-flash-image-preview is needed for 4K and configurable imageSize
      const useHighResVendor = resolution !== '1K' || (process.env.API_KEY && hasApiKey);
      const model = useHighResVendor ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';

      const response = await genAI.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type,
              },
            },
            {
              text: `Upscale this image to ${resolution} resolution. Preserve all original details, colors, and composition perfectly. Enhance the clarity and sharpness without introducing artifacts. The output must be a faithful high-fidelity enhanced version of the source.`,
            },
          ],
        },
        config: model === 'gemini-3.1-flash-image-preview' ? {
          imageConfig: {
            imageSize: resolution,
          },
        } : undefined,
      });

      let foundImage = false;
      const candidate = response.candidates?.[0];
      if (candidate && candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            setResultImage(`data:image/png;base64,${part.inlineData.data}`);
            foundImage = true;
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 }
            });
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error("The AI didn't return an image. Please try again with a different resolution or prompt.");
      }

    } catch (err: any) {
      console.error("Upscale error:", err);
      if (err.message?.includes("PERMISSION_DENIED") || err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("This AI model requires a paid API key. Please use the button above to select your key.");
      } else {
        setError(err.message || "An error occurred during upscaling.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const download = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `upscaled_${resolution}_${file?.name || 'image.png'}`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
          AI Image <span className="text-indigo-600">Upscaler</span>
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto text-sm">
          Enhance image quality using Gemini AI. <span className="font-bold text-slate-700">1K</span> is free forever. <span className="font-bold text-slate-700">2K/4K</span> requires a paid key.
        </p>
      </div>

      {!file ? (
        <div 
          {...getRootProps()} 
          className={cn(
            "border-4 border-dashed rounded-3xl p-20 text-center transition-all cursor-pointer",
            isDragActive ? "border-indigo-600 bg-indigo-50 scale-95" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="bg-indigo-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
            <Maximize2 className="w-10 h-10 text-white" />
          </div>
          <p className="text-xl font-bold text-slate-700">Drop your image here</p>
          <p className="text-slate-400 mt-2">Supports JPG, PNG, WEBP up to 10MB</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Input Selection */}
          <div className="space-y-6">
            <div className="bg-slate-50 p-2 rounded-3xl overflow-hidden shadow-inner border border-slate-200">
              <img 
                src={preview || ''} 
                className="w-full h-auto rounded-2xl shadow-sm" 
                alt="Source" 
              />
            </div>
            
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-2 text-slate-400">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs">Processing happens on-device with AI APIs</span>
              </div>
              <button 
                onClick={() => { setFile(null); setPreview(null); setResultImage(null); }}
                className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Start Over
              </button>
            </div>
          </div>

          {/* Right: Controls & Result */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" /> Enhancement Options
                </h3>
                

                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Resolution</label>
                    {!hasApiKey && resolution !== '1K' && (
                      <button 
                        onClick={handleOpenKeySelector}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 underline flex items-center gap-1 animate-pulse"
                      >
                        <Zap className="w-3 h-3 fill-indigo-600" /> TRY PRO (4K)
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['1K', '2K', '4K'].map((res) => (
                      <button
                        key={res}
                        onClick={() => setResolution(res as any)}
                        className={cn(
                          "py-3 rounded-xl font-bold border-2 transition-all",
                          resolution === res 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                            : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200"
                        )}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center italic">
                    Note: 4K processing takes longer and requires more tokens.
                  </p>
                </div>
              </div>

              {!resultImage ? (
                <button 
                  onClick={handleUpscale}
                  disabled={isProcessing}
                  className={cn(
                    "w-full py-5 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 text-lg",
                    isProcessing 
                      ? "bg-slate-400 cursor-not-allowed" 
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 hover:-translate-y-1"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      Reconstructing...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-6 h-6" /> Enhance with AI
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-4">
                   <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3">
                      <div className="bg-green-500 rounded-full p-1">
                        <Maximize2 className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-bold text-green-800">Upscaling Complete!</span>
                   </div>
                   <button 
                    onClick={download}
                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all"
                  >
                    <Download className="w-6 h-6" /> Download {resolution} Version
                  </button>
                  <button 
                    onClick={() => setResultImage(null)}
                    className="w-full text-slate-400 py-2 text-xs font-bold hover:text-indigo-600 underline"
                  >
                    Adjust settings and try again
                  </button>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs">
                  <p className="font-bold mb-1">Error Occurred</p>
                  {error}
                </div>
              )}
            </div>

            {resultImage && (
              <div className="bg-slate-900 p-2 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                <img 
                  src={resultImage} 
                  className="w-full h-auto rounded-2xl" 
                  alt="Upscaled Result" 
                />
                <div className="p-4 flex justify-center">
                  <span className="text-[10px] font-mono text-slate-500">AI ENHANCED VIEW • {resolution}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
