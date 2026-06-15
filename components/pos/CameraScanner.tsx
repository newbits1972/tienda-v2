"use client";

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CameraScannerProps {
    onScan: (barcode: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function CameraScanner({ onScan, isOpen, onClose }: CameraScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
    const [error, setError] = useState<string>('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannedRef = useRef(false);

    // Obtener lista de cámaras disponibles
    useEffect(() => {
        if (isOpen) {
            Html5Qrcode.getCameras()
                .then((devices) => {
                    if (devices && devices.length > 0) {
                        setCameras(devices.map(d => ({ id: d.id, label: d.label })));
                        setError('');
                    } else {
                        setError('No se encontraron cámaras disponibles');
                    }
                })
                .catch((err) => {
                    console.error('Error al obtener cámaras:', err);
                    setError('No se puede acceder a la cámara. Verifica los permisos.');
                });
        }
    }, [isOpen]);

    // Iniciar escáner cuando se abre el modal
    useEffect(() => {
        if (isOpen && cameras.length > 0 && !isScanning) {
            startScanning();
        }

        return () => {
            stopScanning();
        };
    }, [isOpen, cameras, currentCameraIndex]);

    const startScanning = async () => {
        if (!cameras[currentCameraIndex]) return;

        try {
            scannedRef.current = false;

            // Inicializar escáner
            const scanner = new Html5Qrcode('camera-scanner-region');
            scannerRef.current = scanner;

            await scanner.start(
                cameras[currentCameraIndex].id,
                {
                    fps: 10, // Frames por segundo
                    qrbox: { width: 250, height: 150 }, // Área de escaneo
                    aspectRatio: 1.777778, // 16:9
                },
                (decodedText) => {
                    // Solo procesar el primer escaneo
                    if (!scannedRef.current) {
                        scannedRef.current = true;

                        // Reproducir sonido de éxito
                        playBeep();

                        // Llamar al callback con el código escaneado
                        onScan(decodedText);

                        // Cerrar el escáner
                        setTimeout(() => {
                            handleClose();
                        }, 500);
                    }
                },
                (errorMessage) => {
                    // Silenciar errores de escaneo continuo
                    // Solo mostrar errores críticos
                }
            );

            setIsScanning(true);
            setError('');
        } catch (err) {
            console.error('Error al iniciar el escáner:', err);
            setError('No se pudo iniciar la cámara. Intenta de nuevo.');
            setIsScanning(false);
        }
    };

    const stopScanning = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                scannerRef.current = null;
                setIsScanning(false);
            } catch (err) {
                console.error('Error al detener el escáner:', err);
            }
        }
    };

    const handleClose = async () => {
        await stopScanning();
        onClose();
    };

    const switchCamera = async () => {
        if (cameras.length <= 1) return;

        await stopScanning();
        setCurrentCameraIndex((prev) => (prev + 1) % cameras.length);
    };

    const playBeep = () => {
        // Crear un beep simple usando Web Audio API
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800; // Frecuencia del beep
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (err) {
            console.error('Error al reproducir sonido:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl bg-card border-border">
                <div className="p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Camera className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold text-foreground">
                                Escanear Código de Barras
                            </h3>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClose}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Instrucciones */}
                    <div className="text-center text-sm text-muted-foreground">
                        Apunta la cámara al código de barras del producto
                    </div>

                    {/* Área del escáner */}
                    <div className="relative">
                        <div
                            id="camera-scanner-region"
                            className="w-full rounded-lg overflow-hidden bg-muted"
                            style={{ minHeight: '300px' }}
                        />

                        {/* Overlay con marco de escaneo */}
                        {isScanning && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="border-2 border-green-400 w-64 h-40 rounded-lg shadow-lg shadow-green-400/50">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Botón para cambiar cámara */}
                    {cameras.length > 1 && (
                        <Button
                            onClick={switchCamera}
                            variant="outline"
                            className="w-full"
                            disabled={!isScanning}
                        >
                            <SwitchCamera className="h-4 w-4 mr-2" />
                            Cambiar Cámara ({currentCameraIndex + 1}/{cameras.length})
                        </Button>
                    )}

                    {/* Info */}
                    <div className="text-xs text-muted-foreground text-center">
                        Formatos compatibles: EAN-13, EAN-8, UPC, Code 128, Code 39, QR
                    </div>
                </div>
            </Card>
        </div>
    );
}
