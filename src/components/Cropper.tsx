import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import CropperLib, { Area } from 'react-easy-crop';
import { Upload, Download, Crop as CropIcon, RotateCw, ZoomIn, Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Cropper() {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) setImage(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const downloadCroppedImage = async () => {
    if (!image || !croppedAreaPixels) return;

    const img = await createImage(image);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const rotRad = (rotation * Math.PI) / 180;
    const { width: bWidth, height: bHeight } = {
      width: Math.abs(Math.cos(rotRad) * img.width) + Math.abs(Math.sin(rotRad) * img.height),
      height: Math.abs(Math.sin(rotRad) * img.width) + Math.abs(Math.cos(rotRad) * img.height),
    };

    canvas.width = bWidth;
    canvas.height = bHeight;

    ctx.translate(bWidth / 2, bHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-img.width / 2, -img.height / 2);
    ctx.drawImage(img, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    
    croppedCanvas.width = croppedAreaPixels.width;
    croppedCanvas.height = croppedAreaPixels.height;
    
    croppedCtx?.drawImage(
      canvas,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    const dataUrl = croppedCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = 'cropped-image.png';
    a.href = dataUrl;
    a.click();
  };

  return (
    <div className="p-0 flex flex-col h-full min-h-[500px]">
      {!image ? (
        <div className="p-12 flex-1 flex flex-col items-center justify-center">
            <div {...getRootProps()} className={cn(
            "w-full max-w-xl border-3 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer border-slate-200 hover:border-orange-300 hover:bg-slate-50",
            isDragActive && "border-orange-500 bg-orange-50"
            )}>
            <input {...getInputProps()} />
            <CropIcon className="w-10 h-10 text-orange-600" />
            <p className="font-bold">Select image to crop</p>
            <p className="text-sm text-slate-500">Perfect for profile pictures & social posts</p>
            </div>
        </div>
      ) : (
        <div className="flex flex-col h-full md:flex-row">
          <div className="relative flex-1 bg-slate-900 overflow-hidden min-h-[400px]">
            <CropperLib
              image={image}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={4 / 3}
              onCropChange={setCrop}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          
          <div className="w-full md:w-80 bg-white border-l border-slate-200 p-8 space-y-8">
             <div className="space-y-4">
               <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                 <Settings2 className="w-4 h-4 text-orange-500" /> Adjustments
               </h3>
               
               <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                    <span>Zoom</span>
                    <span>{zoom.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min={1} 
                    max={3} 
                    step={0.1} 
                    value={zoom} 
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    title="Magnify or shrink the image within the cropping frame."
                  />
               </div>

               <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                    <span>Rotation</span>
                    <span>{rotation}°</span>
                  </div>
                  <input 
                    type="range" 
                    min={0} 
                    max={360} 
                    step={1} 
                    value={rotation} 
                    onChange={(e) => setRotation(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    title="Rotate the image clockwise by a specific degree."
                  />
               </div>
             </div>

             <div className="space-y-3">
               <button 
                 onClick={downloadCroppedImage}
                 className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
               >
                 <Download className="w-5 h-5" /> Save Crop
               </button>
               <button 
                 onClick={() => setImage(null)}
                 className="w-full bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all"
               >
                 Cancel
               </button>
             </div>

             <div className="pt-8">
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-[11px] text-orange-700 leading-relaxed">
                   <strong>Pro Tip:</strong> Use your mouse wheel to zoom or drag the image to position it perfectly within the frame.
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

