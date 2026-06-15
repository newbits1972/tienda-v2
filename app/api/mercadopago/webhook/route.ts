export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getMPClient } from '@/lib/payments/mercadoPago';
import { getMPAccessToken } from '@/lib/tenant/configService';
import { Payment } from 'mercadopago';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const topic = url.searchParams.get('topic');
        const id = url.searchParams.get('id');
        const tenantId = url.searchParams.get('tenantId');

        // Webhooks can also come in the body
        const body = await req.json().catch(() => ({}));

        const resourceId = id || body.data?.id || body.resource?.id;
        const resourceType = topic || body.type;

        console.log(`MP Webhook received: ${resourceType} - ${resourceId} for tenant: ${tenantId}`);

        if (resourceType === 'payment') {
            const token = await getMPAccessToken(tenantId || 'default_store');
            const client = getMPClient(token);
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: resourceId });

            console.log('Payment status:', paymentData.status);

            if (paymentData.status === 'approved') {
                const externalReference = paymentData.external_reference;
                console.log('Payment APPROVED for reference:', externalReference);

                if (externalReference) {
                    // 1. First search in 'online_orders'
                    const ordersRef = collection(db, 'online_orders');
                    const q = query(ordersRef, where('pago_id', '==', externalReference));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        for (const orderDoc of querySnapshot.docs) {
                            await updateDoc(doc(db, 'online_orders', orderDoc.id), {
                                pago_confirmado: true,
                                mp_payment_id: resourceId,
                                updated_at: Timestamp.now()
                            });
                            console.log(`Order ${orderDoc.id} marked as PAID via webhook`);
                        }
                    } else {
                        // 2. If not found, maybe it's a direct POS sale reference
                        console.log('No online order found for this reference, might be a POS direct sale.');
                    }
                }
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error: any) {
        console.error('Webhook error:', error);
        // MP expects a 200 even if we fail to process, otherwise they retry
        return NextResponse.json({ received: false, error: error.message }, { status: 200 });
    }
}

