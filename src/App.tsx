/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileImage, 
  Maximize, 
  ImageDown, 
  Crop, 
  Palette, 
  Settings2, 
  ArrowLeft,
  Zap,
  ShieldCheck,
  Cpu,
  Eraser,
  Sparkles,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { cn } from './lib/utils';

// Tool Components (To be implemented)
import Compressor from './components/Compressor';
import Resizer from './components/Resizer';
import Converter from './components/Converter';
import Cropper from './components/Cropper';
import Editor from './components/Editor';
import ColorPicker from './components/ColorPicker';
import Watermarker from './components/Watermarker';
import MemeGenerator from './components/MemeGenerator';
import HtmlToImage from './components/HtmlToImage';
import BackgroundRemover from './components/BackgroundRemover';
import WatermarkRemover from './components/WatermarkRemover';
import Upscaler from './components/Upscaler';
import ImageGenerator from './components/ImageGenerator';

type ToolId = 'compress' | 'resize' | 'convert' | 'crop' | 'edit' | 'picker' | 'watermark' | 'remove-watermark' | 'upscale' | 'image-gen' | 'meme' | 'html2img' | 'remove-bg' | 'to-jpg' | 'from-jpg' | null;

interface Tool {
  id: ToolId;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  seoTitle: string;
  seoText: string;
}

const TOOLS: Tool[] = [
  {
    id: 'image-gen',
    name: 'AI Image Gen',
    description: 'Turn your text into stunning artwork.',
    icon: <Sparkles className="w-6 h-6" />,
    color: 'bg-indigo-600',
    seoTitle: 'AI Image Generator Online',
    seoText: 'Create unique AI art from text prompts using Gemini 2.5.'
  },
  {
    id: 'compress',
    name: 'Image Compress',
    description: 'Reduce file size without losing quality.',
    icon: <ImageDown className="w-6 h-6" />,
    color: 'bg-blue-500',
    seoTitle: 'Compress Image Online Free',
    seoText: 'Shrink your images securely in the browser. No file upload tracking.'
  },
  {
    id: 'resize',
    name: 'Image Resize',
    description: 'Change dimensions for any platform.',
    icon: <Maximize className="w-6 h-6" />,
    color: 'bg-purple-500',
    seoTitle: 'Resize Image Free Online',
    seoText: 'Scale your photos to custom widths and heights instantly.'
  },
  {
    id: 'convert',
    name: 'Universal Converter',
    description: 'PNG, JPG, WebP, SVG, HEIC and more.',
    icon: <FileImage className="w-6 h-6" />,
    color: 'bg-emerald-500',
    seoTitle: 'Universal Image Converter',
    seoText: 'Convert between popular image formats with zero quality loss.'
  },
  {
    id: 'to-jpg',
    name: 'Convert to JPG',
    description: 'Convert any image to high-quality JPG.',
    icon: <ImageDown className="w-6 h-6" />,
    color: 'bg-orange-500',
    seoTitle: 'Convert Image to JPG Online',
    seoText: 'Fast and secure conversion to JPEG format in your browser.'
  },
  {
    id: 'from-jpg',
    name: 'Convert from JPG',
    description: 'Turn JPGs into PNG or WebP.',
    icon: <ArrowLeft className="w-6 h-6" />,
    color: 'bg-emerald-600',
    seoTitle: 'Convert from JPG to PNG/WebP',
    seoText: 'Recover transparency or optimize for web with one click.'
  },
  {
    id: 'crop',
    name: 'Image Crop',
    description: 'Perfectly frame your pictures.',
    icon: <Crop className="w-6 h-6" />,
    color: 'bg-orange-500',
    seoTitle: 'Crop Image Online Free',
    seoText: 'The easiest way to crop photos for social media or print.'
  },
  {
    id: 'edit',
    name: 'Photo Editor',
    description: 'Quick filters and adjustments.',
    icon: <Settings2 className="w-6 h-6" />,
    color: 'bg-indigo-500',
    seoTitle: 'Free Online Photo Editor',
    seoText: 'Basic edits like brightness, contrast, and filters in seconds.'
  },
  {
    id: 'picker',
    name: 'Color Picker',
    description: 'Get HEX/RGB from any image.',
    icon: <Palette className="w-6 h-6" />,
    color: 'bg-pink-500',
    seoTitle: 'Image Color Picker Tool',
    seoText: 'Pick colors directly from your pixel-perfect images.'
  },
  {
    id: 'watermark',
    name: 'Watermark Image',
    description: 'Protect your brand with custom text/images.',
    icon: <ShieldCheck className="w-6 h-6" />,
    color: 'bg-amber-500',
    seoTitle: 'Add Watermark to Image Online',
    seoText: 'Protect your content with transparent text or logo overlays.'
  },
  {
    id: 'meme',
    name: 'Meme Generator',
    description: 'Create viral content in seconds.',
    icon: <Zap className="w-6 h-6" />,
    color: 'bg-rose-500',
    seoTitle: 'Free Online Meme Maker',
    seoText: 'Classic and modern layout memes with custom text rendering.'
  },
  {
    id: 'html2img',
    name: 'HTML to Image',
    description: 'Convert web content to pictures.',
    icon: <FileImage className="w-6 h-6" />,
    color: 'bg-sky-500',
    seoTitle: 'Web Content to Image Converter',
    seoText: 'Capture any HTML/CSS design as a high-quality PNG or JPG.'
  },
  {
    id: 'remove-bg',
    name: 'Background Remover',
    description: 'Transparent images with one click.',
    icon: <Crop className="w-6 h-6" />,
    color: 'bg-indigo-600',
    seoTitle: 'Remove Image Background Free',
    seoText: 'Create transparent PNGs instantly using browser-native tech.'
  },
  {
    id: 'remove-watermark',
    name: 'Watermark Remover',
    description: 'Erase unwanted marks and objects.',
    icon: <Eraser className="w-6 h-6" />,
    color: 'bg-red-500',
    seoTitle: 'Remove Watermark from Image',
    seoText: 'Erase watermarks, text, or small objects using local pixel blending.'
  },
  {
    id: 'upscale',
    name: 'AI Upscaler',
    description: 'Enhance image quality to 4K.',
    icon: <Sparkles className="w-6 h-6" />,
    color: 'bg-indigo-600',
    seoTitle: 'AI Image Upscaler Online',
    seoText: 'Upscale and enhance low-resolution images to 4K using Gemini AI.'
  }
];

export default function App() {
  const [activeToolId, setActiveToolId] = useState<ToolId>(() => {
    // Basic deep linking for easier WordPress/Elementor embedding
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const toolParam = params.get('tool');
      if (toolParam && TOOLS.some(t => t.id === toolParam)) {
        return toolParam as ToolId;
      }
    }
    return null;
  });

  const activeTool = TOOLS.find(t => t.id === activeToolId);

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-gray-900 font-sans selection:bg-blue-100 italic-none">
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {!activeToolId ? (
            <motion.div
              layoutId="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              {/* Hero Section */}
              <header className="py-16 md:py-24 flex flex-col items-center justify-center px-6 md:px-10 bg-white">
                <div className="text-center mb-8 max-w-3xl">
                  <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 leading-tight">
                    The Universal Image Toolkit
                  </h1>
                  <p className="text-gray-500 text-lg md:text-xl">
                    Fast, free, and secure online image tools. No signups, no uploads to servers — all processing happens in your browser.
                  </p>
                </div>
                
                {/* Secondary Drop Zone Indicator */}
                <div 
                  className="w-full max-w-xl h-24 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl flex items-center justify-center group cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
                  onClick={() => setActiveToolId('compress')} // Default to compressor
                >
                  <div className="flex items-center space-x-3">
                    <FileImage className="w-6 h-6 text-blue-500" />
                    <span className="text-blue-600 font-semibold">Start processing instantly</span>
                    <span className="hidden sm:inline text-gray-400 text-sm">Select a tool below</span>
                  </div>
                </div>
              </header>

              {/* Tools Grid */}
              <div className="px-6 md:px-10 py-12 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {TOOLS.map((tool) => (
                    <motion.div
                      key={tool.id}
                      whileHover={{ y: -4, borderColor: 'var(--color-blue-400)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveToolId(tool.id)}
                      className="bg-white p-5 rounded-xl border border-gray-200 flex flex-col justify-between cursor-pointer group transition-all h-[180px] shadow-sm hover:shadow-md"
                    >
                      <div>
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4 text-white", tool.color)}>
                          {tool.icon}
                        </div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{tool.name}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tool.description}</p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">
                        Free Online
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Features Section */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-gray-100 pt-16">
                  <div className="space-y-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold">Privacy First</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">No tracking, no storage. Your data stays on your machine, period.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold">Zero latency</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">Fast client-side processing using WebAssembly and modern browser APIs.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold">Pro Quality</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">Industry standard libraries for compression and conversion.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-6xl mx-auto px-6 py-12 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveToolId(null)}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-white hover:border-blue-200 text-gray-500 hover:text-blue-600 transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">{activeTool?.seoTitle}</h1>
                    <p className="text-sm text-gray-500">{activeTool?.seoText}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden min-h-[600px] relative">
                {activeToolId === 'compress' && <Compressor />}
                {activeToolId === 'resize' && <Resizer />}
                {activeToolId === 'convert' && <Converter />}
                {activeToolId === 'to-jpg' && <Converter initialFormat="image/jpeg" />}
                {activeToolId === 'from-jpg' && <Converter initialFormat="image/png" />}
                {activeToolId === 'crop' && <Cropper />}
                {activeToolId === 'edit' && <Editor />}
                {activeToolId === 'picker' && <ColorPicker />}
                {activeToolId === 'watermark' && <Watermarker />}
                {activeToolId === 'meme' && <MemeGenerator />}
                {activeToolId === 'html2img' && <HtmlToImage />}
                {activeToolId === 'remove-bg' && <BackgroundRemover />}
                {activeToolId === 'remove-watermark' && <WatermarkRemover />}
                {activeToolId === 'upscale' && <Upscaler />}
                {activeToolId === 'image-gen' && <ImageGenerator />}
              </div>

              <div className="flex justify-center">
                <a 
                  href={`mailto:feedback@pixelforge.io?subject=Feedback for ${activeTool?.name}`}
                  className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
                >
                  <AlertCircle className="w-3 h-3" />
                  Report an issue with this tool
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

