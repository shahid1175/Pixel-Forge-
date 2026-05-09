import React, { useState, useCallback } from 'react';
import { 
  Sparkles, 
  Download, 
  RefreshCw, 
  Image as ImageIcon,
  Layout,
  Type,
  AlertCircle,
  Loader2,
  Zap,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenerativeAI } from "@google/generative-ai";
import confetti from 'canvas-confetti';

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', icon: <div className="w-4 h-4 border-2 border-current rounded-sm" /> },
  { label: '4:3', value: '4:3', icon: <div className="w-5 h-4 border-2 border-current rounded-sm" /> },
  { label: '3:4', value: '3:4', icon: <div className="w-4 h-5 border-2 border-current rounded-sm" /> },
  { label: '16:9', value: '16:9', icon: <div className="w-6 h-4 border-2 border-current rounded-sm" /> },
  { label: '9:16', value: '9:16', icon: <div className="w-4 h-6 border-2 border-current rounded-sm" /> },
];

const SUGGESTIONS = [
  "A futuristic cyberpunk city with neon lights and flying cars",
  "A majestic mountain landscape at sunset with a crystal clear lake",
  "A cute robot holding a red balloon in a minimalist style",
  "An abstract watercolor painting of a bustling cosmic nebula",
  "A high-detail 3D render of a lush enchanted forest with glowing mushrooms"
];

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      
      const model = ai.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
      });

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: `${prompt} | Output aspect ratio: ${aspectRatio}` }],
        }]
      });
      const response = result.response;

      const newImages: string[] = [];
      const parts = response.candidates?.[0]?.content?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64Data}`;
          newImages.push(imageUrl);
        }
      }

      if (newImages.length > 0) {
        setGeneratedImages(prev => [...newImages, ...prev]);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        throw new Error("No image was generated. Try a different prompt.");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate image. Please check your API key or connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const useSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Input Panel */}
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              AI Image <span className="text-indigo-600">Generator</span> <Sparkles className="w-6 h-6 text-indigo-500" />
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-md">
              Create stunning, high-quality images directly from your descriptions using the latest Gemini AI technology.
            </p>
          </div>

          <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
             {/* Decorative background element */}
             <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
             
             <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Type className="w-3 h-3" /> Describe your vision
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A cinematic shot of a..."
                  className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all resize-none font-medium"
                />
             </div>

             <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Layout className="w-3 h-3" /> Aspect Ratio
                </label>
                <div className="flex flex-wrap gap-2">
                   {ASPECT_RATIOS.map((ratio) => (
                     <button
                        key={ratio.value}
                        onClick={() => setAspectRatio(ratio.value)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border",
                          aspectRatio === ratio.value 
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50"
                        )}
                     >
                       {ratio.icon} {ratio.label}
                     </button>
                   ))}
                </div>
             </div>

             <button 
                onClick={generateImage}
                disabled={isGenerating || !prompt.trim()}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-3 transition-all",
                  isGenerating || !prompt.trim() 
                    ? "bg-slate-200 cursor-not-allowed" 
                    : "bg-slate-900 hover:bg-indigo-600 shadow-xl shadow-slate-200 hover:shadow-indigo-100 active:scale-[0.98]"
                )}
             >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating with Gemini...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-white" />
                    Generate Masterpiece
                  </>
                )}
             </button>

             {error && (
               <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                 <AlertCircle className="w-4 h-4 shrink-0" />
                 {error}
               </div>
             )}
          </div>

          <div className="space-y-4">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Need inspiration?</h4>
             <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => useSuggestion(s)}
                    className="group text-left p-3 rounded-xl hover:bg-white border border-transparent hover:border-indigo-100 transition-all flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center text-[10px] font-black">
                      {i + 1}
                    </div>
                    <span className="text-xs text-slate-600 group-hover:text-indigo-600 font-medium truncate">{s}</span>
                    <ArrowRight className="w-3 h-3 text-slate-300 ml-auto opacity-0 group-hover:opacity-100 transition-all mr-2" />
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Output Panel */}
        <div className="space-y-6">
           <div className="bg-slate-900 rounded-[2.5rem] p-4 shadow-2xl relative min-h-[500px] flex flex-col">
              <div className="flex-1 flex items-center justify-center border-4 border-slate-800 rounded-[2rem] overflow-hidden bg-slate-800/50 relative">
                 {generatedImages.length > 0 ? (
                   <img 
                    src={generatedImages[0]} 
                    className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-700" 
                    alt="Generated" 
                   />
                 ) : (
                   <div className="text-center space-y-6 p-8">
                      <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto shadow-inner relative group">
                        <ImageIcon className="w-8 h-8 text-slate-700 group-hover:text-indigo-500 transition-colors" />
                        <div className="absolute inset-0 rounded-3xl border border-slate-700 pointer-events-none" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-white font-bold tracking-tight">Ready to generate</p>
                        <p className="text-slate-500 text-xs max-w-[200px] mx-auto leading-relaxed">
                          Your masterpiece will appear here. Processing is 100% cloud-native via Gemini.
                        </p>
                      </div>
                   </div>
                 )}

                 {isGenerating && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10 space-y-4">
                       <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                       <div className="text-center space-y-1">
                          <p className="text-white font-bold text-sm tracking-wide animate-pulse uppercase">Gemini is sketching...</p>
                          <p className="text-slate-400 text-[10px]">Usually takes 10-20 seconds</p>
                       </div>
                    </div>
                 )}
              </div>

              {generatedImages.length > 0 && (
                <div className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                       Generated by Gemini
                     </span>
                   </div>
                   <button 
                     onClick={() => {
                        const a = document.createElement('a');
                        a.href = generatedImages[0];
                        a.download = `pixelbox-ai-${Date.now()}.png`;
                        a.click();
                     }}
                     className="bg-white text-slate-900 px-6 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-slate-100 transition-all shadow-lg active:scale-95"
                   >
                     <Download className="w-4 h-4" /> Download 
                   </button>
                </div>
              )}
           </div>

           {/* History / Gallery */}
           {generatedImages.length > 1 && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                  <RefreshCw className="w-3 h-3" /> Generation History
                </h4>
                <div className="grid grid-cols-4 gap-4">
                   {generatedImages.slice(1, 9).map((img, idx) => (
                     <div 
                        key={idx} 
                        className="aspect-square rounded-2xl overflow-hidden border border-slate-200 cursor-pointer hover:border-indigo-500 transition-all flex group relative"
                        onClick={() => {
                          const newHistory = [...generatedImages];
                          const selected = newHistory.splice(idx + 1, 1)[0];
                          setGeneratedImages([selected, ...newHistory]);
                        }}
                     >
                       <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={`History ${idx}`} />
                       <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-white drop-shadow" />
                       </div>
                     </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
