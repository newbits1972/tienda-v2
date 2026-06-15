export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cancelPointPaymentIntent } from '@/lib/payments/mercadoPago';
import { getMPAccessToken } from '@/lib/tenant/configService';

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const deviceId = searchParams.get('deviceId');
        const tenantId = searchParams.get('tenantId');

        console.log('[Point Intent Cancel] Request:', { deviceId, tenantId });

        if (!deviceId) {
            return NextResponse.json({ error: 'Falta deviceId' }, { status: 400 });
        }

        const token = await getMPAccessToken(tenantId || 'default_store');

        if (!token) {
            return NextResponse.json({ error: 'Access Token no configurado' }, { status: 500 });
        }

        const data = await cancelPointPaymentIntent(token, deviceId);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Point Intent Cancel] Error:', error);
        return NextResponse.json({
            error: 'Error al cancelar el cobro pendiente',
            details: error.message
        }, { status: 500 });
    }
}

