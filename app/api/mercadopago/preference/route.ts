export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createPreference } from '@/lib/payments/mercadoPago';
import { getMPAccessToken } from '@/lib/tenant/configService';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { items, externalReference, tenantId, backUrls } = body;

        if (!items || !items.length) {
            return NextResponse.json({ error: 'Faltan productos' }, { status: 400 });
        }

        const token = await getMPAccessToken(tenantId || 'default_store');
        if (!token) {
            return NextResponse.json({
                error: 'Mercado Pago no configurado',
                message: 'No se encontró el token de acceso para este comercio. Por favor configurarlo en el panel de administración.'
            }, { status: 400 });
        }

        const response = await createPreference(token, tenantId || 'default_store', items, externalReference, backUrls);

        return NextResponse.json({
            id: response.id,
            init_point: response.init_point,
            sandbox_init_point: response.sandbox_init_point
        });
    } catch (error: any) {
        console.error('Error creating MP preference:', error);

        // Return more specific error details if available from the MP SDK
        const details = error.response?.data || error.message;

        return NextResponse.json({
            error: 'Error al crear la preferencia de pago',
            details: details,
            message: error.message
        }, { status: 500 });
    }
}

