export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { changePointMode } from '@/lib/payments/mercadoPago';
import { getMPAccessToken } from '@/lib/tenant/configService';

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { deviceId, mode, tenantId } = body;

        console.log('[Point Mode] Request:', { deviceId, mode, tenantId });

        if (!deviceId || !mode) {
            return NextResponse.json({ error: 'Faltan datos (deviceId o mode)' }, { status: 400 });
        }

        const token = await getMPAccessToken(tenantId || 'default_store');

        if (!token) {
            return NextResponse.json({ error: 'Access Token no configurado' }, { status: 500 });
        }

        const data = await changePointMode(token, deviceId, mode);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Point Mode] Error:', error);
        return NextResponse.json({
            error: 'Error al cambiar el modo del dispositivo',
            details: error.message
        }, { status: 500 });
    }
}

