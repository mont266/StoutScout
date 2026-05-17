import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const InAppCamera = ({ isOpen, onClose, onCapture, onFallback }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [error, setError] = useState(null);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        }
    }, []);

    const startCamera = useCallback(async () => {
        try {
            stopStream();
            setError(null);
            
            // Handle native app OS permissions
            if (Capacitor.isNativePlatform()) {
                try {
                    const status = await Camera.checkPermissions();
                    if (status.camera !== 'granted') {
                        const newStatus = await Camera.requestPermissions({ permissions: ['camera'] });
                        if (newStatus.camera !== 'granted') {
                            throw new Error("Native camera permission was denied. Please check device settings.");
                        }
                    }
                } catch (e) {
                    console.warn("Could not check/request native camera permissions:", e);
                    // Continue anyway, maybe it works via WebChromeClient
                }
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn("getUserMedia not supported in this browser");
                onFallback();
                return;
            }

            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: facingMode } },
                audio: false
            });
            
            streamRef.current = newStream;
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error("InAppCamera error:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || (err.message && err.message.includes('denied'))) {
                 setError("Camera access was denied. Please allow camera permissions in your settings and try again.");
            } else {
                 console.warn("Falling back to system camera due to error:", err);
                 onFallback();
            }
        }
    }, [facingMode, stopStream, onFallback]);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopStream();
        }
        return () => stopStream();
    }, [isOpen, startCamera, stopStream]);

    const handleSwitchCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Lower quality 0.8 to prevent memory spikes
            const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            fetch(imageUrl)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    stopStream(); // Ensure camera turns off instantly
                    onCapture(file, imageUrl);
                })
                .catch(err => {
                    console.error("Failed to convert capture:", err);
                    setError("Failed to capture image. Please try again.");
                });
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black z-[99999] flex flex-col items-center justify-between">
            {/* Header */}
            <div className="w-full flex justify-between items-center p-4 bg-gradient-to-b from-black/70 to-transparent absolute top-0 text-white z-20">
                <button onClick={() => { stopStream(); onClose(); }} className="w-10 h-10 flex items-center justify-center bg-black/40 rounded-full hover:bg-black/60 shadow-md transition-colors">
                    <i className="fas fa-times text-xl"></i>
                </button>
                <div className="flex space-x-4">
                    <button onClick={handleSwitchCamera} className="w-10 h-10 flex items-center justify-center bg-black/40 rounded-full hover:bg-black/60 shadow-md transition-colors">
                        <i className="fas fa-sync-alt text-lg"></i>
                    </button>
                </div>
            </div>

            {/* Video Preview */}
            <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden z-10">
                {error ? (
                    <div className="text-white text-center p-8 w-full max-w-sm mx-auto">
                        <i className="fas fa-exclamation-triangle text-4xl text-amber-500 mb-4"></i>
                        <p className="mb-6">{error}</p>
                        <div className="flex flex-col space-y-4 items-center">
                            <button 
                                onClick={startCamera}
                                className="w-full max-w-[200px] px-6 py-3 bg-amber-500 text-black rounded-lg font-bold"
                            >
                                Retry Camera
                            </button>
                            <button
                                onClick={() => { stopStream(); onFallback(); }}
                                className="w-full max-w-[200px] px-6 py-3 bg-white text-black rounded-lg font-bold cursor-pointer text-center"
                            >
                                Use System Camera
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                    </>
                )}
            </div>

            {/* Footer / Controls */}
            {!error && (
                <div className="w-full h-32 flex items-center justify-center bg-black absolute bottom-0 z-20 pb-8">
                    <button 
                        onClick={handleCapture}
                        className="w-16 h-16 rounded-full border-4 border-white bg-transparent flex items-center justify-center focus:outline-none transition-transform active:scale-95"
                    >
                        <div className="w-12 h-12 rounded-full bg-white"></div>
                    </button>
                </div>
            )}
        </div>,
        document.body
    );
};

export default InAppCamera;
