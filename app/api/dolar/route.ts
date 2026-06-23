import { NextResponse } from 'next/server';
import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * GET /api/dolar
 *
 * Devuelve la cotización del dólar (oficial + blue) para moneda dual simple.
 * Fuente: DolarSi API (https://dolarapi.com/docs/operaciones/operaciones).
 * Cachea 1 hora en Firestore (settings/dolar) para no saturar la API externa.
 */
export async function GET() {
    try {
        // 1. Intentar leer caché reciente (< 1 hora)
        const cacheRef = doc(db, 'settings', 'dolar');
        const cacheSnap = await getDoc(cacheRef);

        const UNA_HORA_MS = 60 * 60 * 1000;
        if (cacheSnap.exists()) {
            const cached = cacheSnap.data();
            const updatedAt = cached.updated_at?.toMillis?.() || 0;
            if (Date.now() - updatedAt < UNA_HORA_MS) {
                return NextResponse.json({
                    oficial: cached.oficial,
                    blue: cached.blue,
                    fuente: 'cache',
                    actualizado: updatedAt,
                });
            }
        }

        // 2. Fetch a la API externa
        const response = await fetch('https://dolarapi.com/v1/dolares', {
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            throw new Error(`DolarAPI respondió ${response.status}`);
        }

        const data = await response.json();

        // data es un array con: { casa, nombre, compra, venta, moneda, fechaActualizacion }
        const oficial = data.find((d: any) => d.casa === 'oficial') || data[0];
        const blue = data.find((d: any) => d.casa === 'blue') || data[1];

        const result = {
            oficial: {
                compra: oficial?.compra || 0,
                venta: oficial?.venta || 0,
            },
            blue: {
                compra: blue?.compra || 0,
                venta: blue?.venta || 0,
            },
            fuente: 'dolarapi.com',
            actualizado: Date.now(),
        };

        // 3. Actualizar caché
        await setDoc(cacheRef, {
            ...result,
            updated_at: Timestamp.now(),
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error en /api/dolar:', error);

        // Fallback: devolver caché aunque sea viejo
        try {
            const cacheRef = doc(db, 'settings', 'dolar');
            const cacheSnap = await getDoc(cacheRef);
            if (cacheSnap.exists()) {
                const cached = cacheSnap.data();
                return NextResponse.json({
                    oficial: cached.oficial,
                    blue: cached.blue,
                    fuente: 'cache-stale',
                    actualizado: cached.updated_at?.toMillis?.() || 0,
                });
            }
        } catch (fallbackErr) {
            console.error('Fallback de caché también falló:', fallbackErr);
        }

        return NextResponse.json(
            { error: 'No se pudo obtener la cotización del dólar', detalle: error.message },
            { status: 500 }
        );
    }
}
