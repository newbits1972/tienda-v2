export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getMPClient } from '@/lib/payments/mercadoPago';
import { getMPAccessToken } from '@/lib/tenant/configService';
import { Payment } from 'mercadopago';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tenantId } = body;
        console.log('Processing payment with body:', JSON.stringify(body, null, 2));

        const token = await getMPAccessToken(tenantId || 'default_store');
        const client = getMPClient(token);
        const payment = new Payment(client);

        // Map and validate fields to avoid SDK crashes
        const transactionAmount = Number(body.transaction_amount);
        const installments = Number(body.installments);

        if (isNaN(transactionAmount) || transactionAmount <= 0) {
            return NextResponse.json({ error: 'Monto de transacción inválido' }, { status: 400 });
        }

        // Build the request body carefully
        const paymentBody: any = {
            transaction_amount: transactionAmount,
            token: body.token,
            description: body.description || 'Venta POS DataSense',
            installments: installments,
            payment_method_id: body.payment_method_id,
            payer: {
                email: body.payer?.email,
            },
            external_reference: body.external_reference,
            notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/webhook`,
        };

        // Optional fields
        if (body.issuer_id) {
            paymentBody.issuer_id = Number(body.issuer_id);
        }

        if (body.payer?.identification) {
            paymentBody.payer.identification = body.payer.identification;
        }

        const response = await payment.create({
            body: paymentBody
        });

        console.log('MP Payment Response Status:', response.status);

        return NextResponse.json({
            id: response.id,
            status: response.status,
            status_detail: response.status_detail,
        });

    } catch (error: any) {
        console.error('Full Payment Error Object:', error);

        // Detailed error for debugging
        // Extracting as much detail as possible
        const details = error.response?.data || error.message;
        const mpErrorCode = error.response?.data?.cause?.[0]?.code;
        const mpErrorMessage = error.response?.data?.message;

        console.error('MP API Error Details:', JSON.stringify(details, null, 2));

        return NextResponse.json({
            error: 'Error al procesar el pago en Mercado Pago',
            details: details,
            mp_error_code: mpErrorCode,
            mp_error_message: mpErrorMessage,
            original_message: error.message
        }, { status: 500 });
    }
}

