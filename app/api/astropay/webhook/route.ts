export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const tenantId = url.searchParams.get('tenantId') || 'default_store';

        const body = await req.json().catch(() => ({}));
        console.log(`[AstroPay Webhook] Recibido webhook para tenant: ${tenantId}`, JSON.stringify(body, null, 2));

        const { status, merchant_reference, deposit_id } = body;

        if (!merchant_reference) {
            return NextResponse.json({ error: 'Falta referencia de comercio' }, { status: 400 });
        }

        // Validar firma del webhook en producción
        const secretKey = process.env.ASTROPAY_SECRET_KEY || 'sandbox_secret_key_67890';
        const xSignature = req.headers.get('x-signature');

        if (process.env.ASTROPAY_APP_ID !== 'sandbox_app_id_12345' && xSignature) {
            const computedSignature = crypto
                .createHmac('sha256', secretKey)
                .update(JSON.stringify(body))
                .digest('hex');

            if (computedSignature !== xSignature) {
                console.warn('[AstroPay Webhook] Firma inválida.');
                return NextResponse.json({ error: 'Firma no coincide' }, { status: 401 });
            }
        }

        // Mapear el estado
        const estadoAstroPay = (status || '').toLowerCase();
        const approvedStates = ['approved', 'success', 'completed'];

        if (approvedStates.includes(estadoAstroPay)) {
            console.log(`[AstroPay Webhook] Pago APROBADO para referencia: ${merchant_reference}`);

            // Buscar en 'online_orders'
            const ordersRef = collection(db, 'online_orders');
            const q = query(ordersRef, where('pago_id', '==', merchant_reference));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                for (const orderDoc of querySnapshot.docs) {
                    await updateDoc(doc(db, 'online_orders', orderDoc.id), {
                        pago_confirmado: true,
                        astropay_deposit_id: deposit_id || merchant_reference,
                        updated_at: Timestamp.now()
                    });
                    console.log(`[AstroPay Webhook] Orden ${orderDoc.id} marcada como PAGADA.`);
                }
            } else {
                console.log(`[AstroPay Webhook] No se encontró orden con pago_id: ${merchant_reference}`);
            }
        } else {
            console.log(`[AstroPay Webhook] Estado de pago no es aprobador: ${status}`);
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error('[AstroPay Webhook] Error processing webhook:', error);
        // Retornar 200 para que AstroPay no intente reenviar infinitamente
        return NextResponse.json({ received: false, error: error.message }, { status: 200 });
    }
}

export async function GET() {
    return NextResponse.json({ status: 'ok', service: 'AstroPay Webhook' });
}
