export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { items, externalReference, tenantId, backUrls } = body;

        if (!items || !items.length) {
            return NextResponse.json({ error: 'Faltan productos' }, { status: 400 });
        }

        // Calcular el monto total a pagar
        const totalAmount = items.reduce((sum: number, item: any) => {
            // item can be in OnlineOrderItem format: { producto, cantidad, subtotal }
            const quantity = Number(item.cantidad) || 1;
            const subtotal = Number(item.subtotal) || ((item.producto?.precio_venta || 0) * quantity);
            return sum + subtotal;
        }, 0);

        if (totalAmount <= 0) {
            return NextResponse.json({ error: 'El monto de la transacción debe ser mayor a 0' }, { status: 400 });
        }

        const appId = process.env.ASTROPAY_APP_ID || 'sandbox_app_id_12345';
        const secretKey = process.env.ASTROPAY_SECRET_KEY || 'sandbox_secret_key_67890';
        const isSandbox = process.env.ASTROPAY_SANDBOX !== 'false';
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const payload = {
            amount: Number(totalAmount.toFixed(2)),
            currency: 'ARS',
            country: 'AR',
            merchant_reference: externalReference,
            callback_url: `${baseUrl}/api/astropay/webhook?tenantId=${encodeURIComponent(tenantId || 'default_store')}`,
            redirect_url: backUrls?.success || `${baseUrl}/catalogo/${tenantId}?status=success`,
            user: {
                merchant_user_id: `guest_${Date.now()}`,
                email: 'cliente@tienda.com',
            },
            product_description: `Compra en Tienda - Ref: ${externalReference}`,
        };

        console.log('[AstroPay Preference] Creando pago con payload:', JSON.stringify(payload, null, 2));

        // Si se usan credenciales mock, simular la respuesta
        if (appId === 'sandbox_app_id_12345') {
            console.warn('[AstroPay Preference] Utilizando modo simulado');
            const signature = crypto
                .createHmac('sha256', secretKey)
                .update(JSON.stringify(payload))
                .digest('hex');

            return NextResponse.json({
                success: true,
                redirect_url: `https://onetouch-sandbox.astropay.com/deposit/${externalReference}?merchant=${appId}&sig=${signature}`,
                merchant_reference: externalReference
            });
        }

        const astropayApiUrl = isSandbox
            ? 'https://partners-api-sandbox.astropay.com/api/v1/checkout'
            : 'https://partners-api.astropay.com/api/v1/checkout';

        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(JSON.stringify(payload))
            .digest('hex');

        const response = await fetch(astropayApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-App-Id': appId,
                'X-Signature': signature,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[AstroPay Preference] Error de la API de AstroPay:', response.status, errorText);
            throw new Error(`AstroPay API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return NextResponse.json({
            success: true,
            redirect_url: data.redirect_url || data.cashier_url,
            merchant_reference: externalReference
        });

    } catch (error: any) {
        console.error('Error creating AstroPay preference:', error);
        return NextResponse.json({
            error: 'Error al crear la orden de pago en AstroPay',
            details: error.message
        }, { status: 500 });
    }
}
