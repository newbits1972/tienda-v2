'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function NetworkStatus() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Initial check
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Conexión restaurada', {
                description: 'El sistema ha vuelto a estar en línea.',
            });
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast.error('Sin conexión a Internet', {
                description: 'Modo sin conexión activado. Los datos se guardarán localmente.',
                duration: 5000,
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null; // Opcional: ocultar si está online, o mostrar siempre

    return (
        <div className={cn(
            "fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-5",
            isOnline
                ? "bg-green-500/90 text-white"
                : "bg-red-500/90 text-white"
        )}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="text-sm font-medium">
                {isOnline ? 'En línea' : 'Sin conexión'}
            </span>
        </div>
    );
}
