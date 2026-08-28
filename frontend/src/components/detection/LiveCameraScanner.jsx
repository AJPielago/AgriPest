import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RefreshCw, Zap, ZapOff, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { detectionService } from '../../services/detectionService';
import { useLanguage } from '../../context/LanguageContext';

export const LiveCameraScanner = ({ selectedCropId, onCaptureFrame, loading = false }) => {
  const { lang, t } = useLanguage();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [autoCapture, setAutoCapture] = useState(true);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const [scanningStatus, setScanningStatus] = useState('scanning'); // 'scanning' | 'recognized' | 'capturing'
  const [liveBoxes, setLiveBoxes] = useState([]);
  const [liveConfidence, setLiveConfidence] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [stabilityCount, setStabilityCount] = useState(0);
  const [flashTriggered, setFlashTriggered] = useState(false);

  // Initialize Camera Stream
  useEffect(() => {
    let currentStream = null;

    const startCamera = async () => {
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setStreamActive(true);
          };
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraError(err.message || t('cameraAccessError'));
        setStreamActive(false);
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      setStreamActive(false);
    };
  }, [facingMode, t]);

  // Capture Frame Canvas Helper
  const captureCanvasBlob = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `live_camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          resolve(file);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.92);
    });
  }, []);

  // Trigger Final Capture & Pass to Diagnostics
  const executeCapture = useCallback(async () => {
    setScanningStatus('capturing');
    setFlashTriggered(true);

    const file = await captureCanvasBlob();
    if (file) {
      setTimeout(() => {
        setFlashTriggered(false);
        onCaptureFrame(file);
      }, 300);
    } else {
      setScanningStatus('scanning');
      setFlashTriggered(false);
    }
  }, [captureCanvasBlob, onCaptureFrame]);

  // Live Stream Pre-Screening Loop (400ms Interval)
  useEffect(() => {
    if (!streamActive || loading || scanningStatus === 'capturing') return;

    let isSubscribed = true;

    const pollInterval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || video.paused || video.ended) return;

      // Draw low-res frame to hidden sampler canvas
      const samplerCanvas = canvasRef.current;
      if (!samplerCanvas) return;
      samplerCanvas.width = 480;
      samplerCanvas.height = Math.round((video.videoHeight / video.videoWidth) * 480);
      const ctx = samplerCanvas.getContext('2d');
      ctx.drawImage(video, 0, 0, samplerCanvas.width, samplerCanvas.height);

      samplerCanvas.toBlob(async (blob) => {
        if (!blob || !isSubscribed) return;
        const frameFile = new File([blob], 'sampler_frame.jpg', { type: 'image/jpeg' });

        try {
          const result = await detectionService.checkLiveFrame(frameFile, selectedCropId ? parseInt(selectedCropId) : null);
          if (!isSubscribed) return;

          setLiveBoxes(result.bounding_boxes || []);
          setLiveConfidence(result.confidence || 0);
          setStatusMessage(result.message || '');

          if (result.crop_recognized && result.confidence >= 0.80) {
            setScanningStatus('recognized');
            setStabilityCount((prev) => {
              const nextCount = prev + 1;
              if (autoCapture && nextCount >= 2) {
                executeCapture();
              }
              return nextCount;
            });
          } else {
            setScanningStatus('scanning');
            setStabilityCount(0);
          }
        } catch (err) {
          // Silent catch for rapid background polling
        }
      }, 'image/jpeg', 0.7);

    }, 400);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [streamActive, loading, scanningStatus, autoCapture, selectedCropId, executeCapture]);

  const toggleCameraDirection = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 shadow-lg text-white space-y-4">
      
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant={scanningStatus === 'recognized' ? 'success' : 'info'} className="flex items-center gap-1 font-mono uppercase">
            <span className={`w-2 h-2 rounded-full ${scanningStatus === 'recognized' ? 'bg-emerald-400 animate-ping' : 'bg-sky-400'}`} />
            {scanningStatus === 'recognized' 
              ? (lang === 'tl' ? 'NAKILALA ANG PANANIM' : 'CROP RECOGNIZED')
              : (lang === 'tl' ? 'NAGHAHANAP NG PANANIM' : 'SCANNING FOR CROP')}
          </Badge>
          {liveConfidence > 0 && (
            <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {Math.round(liveConfidence * 100)}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoCapture(!autoCapture)}
            className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              autoCapture 
                ? 'bg-emerald-950 border border-emerald-700 text-emerald-300' 
                : 'bg-slate-800 border border-slate-700 text-slate-400'
            }`}
          >
            {autoCapture ? <Zap className="w-3 h-3 text-emerald-400" /> : <ZapOff className="w-3 h-3 text-slate-400" />}
            {autoCapture ? t('autoCaptureEnabled') : t('autoCaptureDisabled')}
          </button>

          <button
            type="button"
            onClick={toggleCameraDirection}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title={t('switchCamera')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {cameraError && (
        <Alert type="danger" className="text-xs bg-rose-950 border-rose-800 text-rose-200">
          <ShieldAlert className="w-4 h-4 text-rose-400 inline mr-2" />
          {cameraError}
        </Alert>
      )}

      {/* Main Video View Finder Container */}
      <div className="relative rounded-lg bg-slate-900 aspect-video overflow-hidden border border-slate-800 flex items-center justify-center">
        
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${streamActive ? 'opacity-100' : 'opacity-20'}`}
        />

        <canvas ref={canvasRef} className="hidden" />

        {/* Flash Animation Overlay */}
        {flashTriggered && (
          <div className="absolute inset-0 bg-white animate-fade-out z-30 pointer-events-none" />
        )}

        {/* Real-time Bounding Box Overlays */}
        {streamActive && liveBoxes.map((box, index) => (
          <div
            key={index}
            className="absolute border-2 border-emerald-400 bg-emerald-500/10 rounded pointer-events-none transition-all duration-200 z-10"
            style={{
              left: `${(box.x_min || box.x || 0.2) * 100}%`,
              top: `${(box.y_min || box.y || 0.25) * 100}%`,
              width: `${((box.x_max ? box.x_max - box.x_min : box.width || 0.5)) * 100}%`,
              height: `${((box.y_max ? box.y_max - box.y_min : box.height || 0.5)) * 100}%`,
            }}
          >
            <span className="absolute -top-6 left-0 bg-emerald-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1 font-mono">
              <Sparkles className="w-2.5 h-2.5" />
              {box.label || 'Crop Specimen'} ({Math.round((box.confidence || liveConfidence) * 100)}%)
            </span>
          </div>
        ))}

        {/* Target Reticle Frame Guidelines */}
        {streamActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            <div className={`w-3/4 h-3/4 border-2 border-dashed rounded-xl transition-all duration-300 flex flex-col justify-between p-3 ${
              scanningStatus === 'recognized' 
                ? 'border-emerald-400 bg-emerald-950/20 shadow-[0_0_25px_rgba(52,211,153,0.3)]' 
                : 'border-slate-400/50'
            }`}>
              <div className="flex justify-between">
                <span className={`w-4 h-4 border-t-2 border-l-2 ${scanningStatus === 'recognized' ? 'border-emerald-400' : 'border-slate-300'}`} />
                <span className={`w-4 h-4 border-t-2 border-r-2 ${scanningStatus === 'recognized' ? 'border-emerald-400' : 'border-slate-300'}`} />
              </div>

              {/* Center Status Text */}
              <div className="text-center bg-slate-950/80 backdrop-blur-sm rounded-lg p-2 max-w-xs mx-auto border border-slate-800">
                <p className="text-xs font-bold text-slate-100 flex items-center justify-center gap-1.5">
                  {scanningStatus === 'recognized' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Camera className="w-4 h-4 text-sky-400 animate-pulse" />
                  )}
                  {statusMessage || (scanningStatus === 'recognized' ? t('cropRecognizedAutoCapture') : t('alignCropInFrame'))}
                </p>
                {autoCapture && scanningStatus === 'recognized' && (
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div 
                      className="bg-emerald-400 h-full transition-all duration-300"
                      style={{ width: `${Math.min(stabilityCount * 50, 100)}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <span className={`w-4 h-4 border-b-2 border-l-2 ${scanningStatus === 'recognized' ? 'border-emerald-400' : 'border-slate-300'}`} />
                <span className={`w-4 h-4 border-b-2 border-r-2 ${scanningStatus === 'recognized' ? 'border-emerald-400' : 'border-slate-300'}`} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Manual Override Button */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-400">
          {autoCapture 
            ? (lang === 'tl' ? 'Awtomatikong kukuha ang camera kapag malinaw ang pananim.' : 'Camera will auto-snapshot once plant leaf is recognized.')
            : (lang === 'tl' ? 'I-click ang button para kumuha ng larawan.' : 'Click button below to manually capture live frame.')}
        </p>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={executeCapture}
          disabled={!streamActive || loading || scanningStatus === 'capturing'}
          icon={Camera}
          className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
        >
          {t('manualCaptureNow')}
        </Button>
      </div>

    </div>
  );
};
