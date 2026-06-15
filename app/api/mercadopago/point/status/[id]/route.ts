import { NextRequest, NextResponse } from 'next/server';
import { getPointPaymentIntent } from '@/lib/payments/mercadoPago';
import { getMPAccessToken } from '@/lib/tenant/configService';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get('tenantId');
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'ID de intención missing' }, { status: 400 });
        }

        const token = await getMPAccessToken(tenantId || 'default_store');
        const data = await getPointPaymentIntent(token, id);
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
