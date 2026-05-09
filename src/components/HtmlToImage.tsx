import React, { useState, useRef } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import { Download, FileCode, Monitor, Phone, Tablet, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

export default function HtmlToImage() {
  const [htmlContent, setHtmlContent] = useState('<div style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; padding: 60px; border-radius: 40px; font-family: sans-serif; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">\n  <h1 style="font-size: 48px; margin-bottom: 20px;">Built with PixelForge</h1>\n  <p style="font-size: 20px; opacity: 0.9;">Converting HTML/CSS to high-quality images instantly.</p>\n</div>');
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const capture = async () => {
    if (!elementRef.current) return;
    setIsProcessing(true);

    try {
      const func = format === 'png' ? toPng : toJpeg;
      const dataUrl = await func(elementRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `capture.${format}`;
      link.href = dataUrl;
      link.click();
      
      confetti({ particleCount: 40, origin: { x: 0.5, y: 0.8 } });
    } catch (err) {
      console.error('oops, something went wrong!', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(htmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const viewportWidths = {
    desktop: 'w-full max-w-4xl',
    tablet: 'w-full max-w-2xl',
    mobile: 'w-full max-w-sm'
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <FileCode className="w-5 h-5 text-sky-500" /> HTML / CSS Editor
            </h3>
            <button 
              onClick={copyCode}
              className="text-xs font-bold text-slate-400 hover:text-sky-600 flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          
          <textarea 
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="w-full h-[400px] p-6 bg-slate-900 text-slate-100 font-mono text-sm border-0 rounded-3xl outline-none focus:ring-4 ring-sky-500/20 transition-all resize-none shadow-2xl"
            spellCheck={false}
            title="Write HTML and CSS here to generate personal graphics or social media assets."
          />

          <div className="flex flex-wrap gap-4">
            <div className="bg-white p-1 rounded-2xl border border-slate-200 flex gap-1 shadow-sm">
              <button 
                onClick={() => setViewport('desktop')}
                className={cn("p-2 rounded-xl transition-all", viewport === 'desktop' ? "bg-sky-500 text-white shadow-lg shadow-sky-200" : "text-slate-400 hover:bg-slate-50")}
                title="Desktop Viewport (Large)"
              >
                <Monitor className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewport('tablet')}
                className={cn("p-2 rounded-xl transition-all", viewport === 'tablet' ? "bg-sky-500 text-white shadow-lg shadow-sky-200" : "text-slate-400 hover:bg-slate-50")}
                title="Tablet Viewport (Medium)"
              >
                <Tablet className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewport('mobile')}
                className={cn("p-2 rounded-xl transition-all", viewport === 'mobile' ? "bg-sky-500 text-white shadow-lg shadow-sky-200" : "text-slate-400 hover:bg-slate-50")}
                title="Mobile Viewport (Narrow)"
              >
                <Phone className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-white p-1 rounded-2xl border border-slate-200 flex gap-1 shadow-sm">
                {(['png', 'jpeg'] as const).map(f => (
                  <button 
                    key={f}
                    onClick={() => setFormat(f)}
                    className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", format === f ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50")}
                  >
                    {f}
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-bold">Live Preview</h3>
          <div className="bg-slate-100 rounded-3xl p-8 border border-slate-200 min-h-[400px] flex items-center justify-center overflow-hidden">
             <div 
               className={cn("bg-white transition-all duration-500 ease-in-out origin-center transform", viewportWidths[viewport])}
               ref={elementRef}
               dangerouslySetInnerHTML={{ __html: htmlContent }}
             />
          </div>
          
          <button 
            onClick={capture}
            disabled={isProcessing}
            className="w-full bg-sky-500 text-white py-5 rounded-2xl font-bold text-lg hover:bg-sky-600 transition-all shadow-xl shadow-sky-100 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" /> {isProcessing ? 'Capturing...' : 'Download as Image'}
          </button>
        </div>
      </div>
    </div>
  );
}
