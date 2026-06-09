import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Upload, Check, Trash } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (base64Photo: string | null) => void;
  language: 'id' | 'en';
}

export default function WebcamCapture({ onCapture, language }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImg, setCapturedImg] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  // Stop camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setPermissionDenied(false);
    setCameraActive(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(err => {
          console.warn("Could not play video element, might need user gesture:", err);
        });
      }
    } catch (err) {
      console.warn('Error starting camera stream', err);
      setHasCamera(false);
      setPermissionDenied(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    if (context) {
      // Trigger a flash effect
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 200);

      // Draw video frame onto canvas
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImg(dataUrl);
      onCapture(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setCapturedImg(base64);
      onCapture(base64);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const triggerMockPhoto = () => {
    // Generate a beautiful avatar profile with initials to simulate webcam flow flawlessly if sandbox blocks camera access
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw background linear gradient
      const gradient = ctx.createLinearGradient(0, 0, 300, 300);
      gradient.addColorStop(0, '#bae6fd'); // sky-200
      gradient.addColorStop(1, '#0284c7'); // sky-600
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 300, 300);

      // Add cute user stylized head outline
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(150, 110, 55, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(150, 240, 90, Math.PI, Math.PI * 2);
      ctx.fill();

      // Stamp Text "Guest / Pengunjung"
      ctx.font = 'bold 20px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText('Digital Kiosk Selfie', 150, 40);

      const base64 = canvas.toDataURL('image/jpeg');
      setCapturedImg(base64);
      onCapture(base64);
      stopCamera();
    }
  };

  const removePhoto = () => {
    setCapturedImg(null);
    onCapture(null);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Camera className="w-4 h-4 text-sky-600" />
          {language === 'id' ? 'Dokumentasi Kunjungan (Opsional)' : 'Visit Documentation (Optional)'}
        </label>
        {capturedImg && (
          <button
            type="button"
            onClick={removePhoto}
            className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
          >
            <Trash className="w-3.5 h-3.5" />
            {language === 'id' ? 'Hapus Foto' : 'Remove Photo'}
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* Visual Viewfinder / Photo display */}
        <div className="w-44 h-44 bg-slate-100 rounded-xl overflow-hidden shadow-inner border border-slate-200 relative flex items-center justify-center shrink-0">
          {capturedImg ? (
            <img
              src={capturedImg}
              alt="Cam documentation"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : cameraActive ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {showFlash && (
                <div className="absolute inset-0 bg-white animate-flash-blink z-20" />
              )}
              {/* Overlay guides */}
              <div className="absolute inset-4 border border-dashed border-sky-400 opacity-60 rounded-lg pointer-events-none" />
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-sky-600 text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-widest animate-pulse">
                REC
              </div>
            </div>
          ) : (
            <div className="text-center p-3 text-slate-400 flex flex-col items-center gap-2">
              <Camera className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              <span className="text-xs">
                {language === 'id' ? 'Belum ada foto' : 'No photo yet'}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex-1 flex flex-col gap-2 w-full">
          {!capturedImg && !cameraActive && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow hover:shadow-md transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                {language === 'id' ? 'Aktifkan Kamera' : 'Turn On Camera'}
              </button>
              
              <label className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer">
                <Upload className="w-4 h-4 text-slate-500" />
                {language === 'id' ? 'Unggah Foto' : 'Upload Photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Generative Snapshot backup for isolated frames */}
              <button
                type="button"
                onClick={triggerMockPhoto}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {language === 'id' ? 'Simulasi Foto (Kiosk)' : 'Simulate Photo'}
              </button>
            </div>
          )}

          {cameraActive && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={takeSnapshot}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer transition-all"
                >
                  <Camera className="w-4 h-4" />
                  {language === 'id' ? 'Ambil Foto' : 'Capture Photo'}
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  {language === 'id' ? 'Batal' : 'Cancel'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 italic">
                {language === 'id' 
                  ? 'Kamera Anda diakses secara lokal. Foto disimpan langsung dan aman.' 
                  : 'Your camera is accessed locally. Photos are recorded safely.'}
              </p>
            </div>
          )}

          {capturedImg && (
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800">
                  {language === 'id' ? 'Foto Kunjungan Dilampirkan' : 'Visit Photo Attached'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {language === 'id' ? 'Format JPEG siap disimpan bersama memo.' : 'JPEG Format ready to save.'}
                </p>
              </div>
            </div>
          )}

          {permissionDenied && !capturedImg && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-xl text-left text-xs">
              <strong>{language === 'id' ? 'Akses Kamera Terhambat' : 'Camera Access Restrained'}</strong>
              <p className="mt-0.5 text-[11px] text-amber-800">
                {language === 'id'
                  ? 'Izin kamera ditolak atau sedang digunakan oleh aplikasi lain. Anda dapat mengunggah file foto atau menggunakan tombol "Simulasi Foto (Kiosk)" di atas.'
                  : 'Camera permission was denied or is busy. You can choose to upload a file instead, or use "Simulate Photo".'}
              </p>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
