'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CotizacionDolar {
    oficial: { compra: number; venta: number };
    blue: { compra: number; venta: number };
    fuente: string;
    actualizado: number;
}

/**
 * Hook para consumir la cotización del dólar desde /api/dolar.
 * Cachea en memoria por 1 hora.
 */
let memoryCache: { data: CotizacionDolar; timestamp: number } | null = null;
const UNA_HORA_MS = 60 * 60 * 1000;

export function useDolar() {
    const [cotizacion, setCotizacion] = useState<CotizacionDolar | null>(memoryCache?.data || null);
    const [loading, setLoading] = useState(!memoryCache);
    const [error, setError] = useState<string | null>(null);

    const fetchDolar = useCallback(async (force = false) => {
        // Usar caché en memoria si es fresca
        if (!force && memoryCache && Date.now() - memoryCache.timestamp < UNA_HORA_MS) {
            setCotizacion(memoryCache.data);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/dolar');
            if (!res.ok) throw new Error('Error al obtener cotización');
            const data = await res.json();
            setCotizacion(data);
            memoryCache = { data, timestamp: Date.now() };
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDolar();
    }, [fetchDolar]);

    /**
     * Convierte un monto USD a ARS usando el TC del blue (mercado real para importadores).
     */
    const usdToArs = useCallback((usd: number, tipo: 'oficial' | 'blue' = 'blue'): number => {
        if (!cotizacion) return 0;
        return usd * (cotizacion[tipo]?.venta || 0);
    }, [cotizacion]);

    return { cotizacion, loading, error, refetch: () => fetchDolar(true), usdToArs };
}
