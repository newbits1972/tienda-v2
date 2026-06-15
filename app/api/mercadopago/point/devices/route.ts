export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPointDevices } from '@/lib/payments/mercadoPago';
import { getMPAccessToken } from '@/lib/tenant/configService';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get('tenantId');

        console.log('[Point Devices] Solicitando dispositivos para tenant:', tenantId);

        const token = await getMPAccessToken(tenantId || 'default_store');

        if (!token) {
            console.error('[Point Devices] ❌ No se encontró Access Token de Mercado Pago');
            return NextResponse.json({
                error: 'Access Token de Mercado Pago no configurado',
                devices: [],
                debug: 'Configura MP_ACCESS_TOKEN en .env.local o en Settings > MercadoPago'
            }, { status: 500 });
        }

        console.log('[Point Devices] ✓ Token encontrado:', token.substring(0, 20) + '...');

        const data = await getPointDevices(token);

        console.log('[Point Devices] Respuesta de MP:', JSON.stringify(data, null, 2));

        // Si hay error en la respuesta
        if (data.error) {
            console.error('[Point Devices] ❌ Error de MP:', data.error);
            return NextResponse.json({
                error: data.error,
                devices: [],
                debug: data.errorDetails || 'Revisa que el token tenga permisos de Point',
                helpText: 'Asegúrate de que tu Access Token tenga los scopes: point:devices:read y point:payment-intents:write'
            });
        }

        if (data.devices && data.devices.length > 0) {
            console.log(`[Point Devices] ✓ Se encontraron ${data.devices.length} dispositivo(s)`);
        } else {
            console.warn('[Point Devices] ⚠️ No se encontraron dispositivos vinculados');
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Point Devices] ❌ Error:', error);
        return NextResponse.json({
            error: error.message,
            devices: [],
            debug: 'Revisa los logs del servidor para más detalles'
        }, { status: 500 });
    }
}
