export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createPointPaymentIntent } from '@/lib/payments/mercadoPago';
import { getMPAccessToken } from '@/lib/tenant/configService';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { deviceId, amount, externalReference, tenantId } = body;

        console.log('[Point Intent] Request:', { deviceId, amount, externalReference, tenantId });

        if (!deviceId || !amount) {
            console.error('[Point Intent] ❌ Faltan datos:', { deviceId, amount });
            return NextResponse.json({ error: 'Faltan datos (deviceId o amount)' }, { status: 400 });
        }

        const token = await getMPAccessToken(tenantId || 'default_store');

        if (!token) {
            console.error('[Point Intent] ❌ No se encontró Access Token');
            return NextResponse.json({ error: 'Access Token no configurado' }, { status: 500 });
        }

        console.log('[Point Intent] ✓ Token encontrado:', token.substring(0, 20) + '...');
        console.log('[Point Intent] Enviando a MP:', { deviceId, amount, externalReference });

        const data = await createPointPaymentIntent(token, deviceId, amount, externalReference);

        console.log('[Point Intent] ✓ Respuesta de MP:', data);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Point Intent] ❌ Error completo:', error);
        console.error('[Point Intent] ❌ Stack:', error.stack);
        return NextResponse.json({
            error: 'Error al enviar el cobro a la terminal Point',
            details: error.message,
            debug: error.stack
        }, { status: 500 });
    }
}

