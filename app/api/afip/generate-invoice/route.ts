import { NextRequest, NextResponse } from 'next/server';
import { createAfipClientFromFirestore } from '@/lib/fiscal/afipFirestore';
import { CartItem } from '@/lib/types';

/**
 * POST /api/afip/generate-invoice
 * Generates a real electronic invoice with AFIP CAE
 * 
 * Body: {
 *   tenantId: string,
 *   tipo_comprobante: 'factura_a' | 'factura_b' | 'ticket',
 *   cliente_cuit?: string (required for Factura A),
 *   cliente_nombre: string,
 *   items: CartItem[],
 *   total: number,
 *   fecha: string (ISO date)
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tenantId,
            tipo_comprobante,
            cliente_cuit,
            cliente_nombre,
            total,
            fecha
        } = body;

        // Validate required fields
        if (!tenantId || !tipo_comprobante || !total) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            );
        }

        // Factura A requires CUIT
        if (tipo_comprobante === 'factura_a' && !cliente_cuit) {
            return NextResponse.json(
                { error: 'Factura A requiere CUIT del cliente' },
                { status: 400 }
            );
        }

        // Create AFIP client from Firestore
        console.log('[AFIP-API] Creating client...');
        const { afip, punto_venta } = await createAfipClientFromFirestore(tenantId);
        console.log('[AFIP-API] Client created. PV:', punto_venta);

        // Determine voucher type code
        const voucherTypeMap: { [key: string]: number } = {
            'factura_a': 1,
            'factura_b': 6,
            'ticket': 11
        };
        const cbteTipo = voucherTypeMap[tipo_comprobante] || 6;

        // Get last voucher number from AFIP
        console.log(`[AFIP-API] Getting last voucher for PV ${punto_venta}, Type ${cbteTipo}...`);
        const lastVoucher = await afip.ElectronicBilling.getLastVoucher(punto_venta, cbteTipo);
        const nextNumber = lastVoucher + 1;
        console.log('[AFIP-API] Next number:', nextNumber);

        // Calculate IVA (simplified - assumes 21%)
        const base = total / 1.21;
        const ivaAmount = total - base;

        // Prepare invoice data for AFIP
        const invoiceData = {
            CantReg: 1,
            PtoVta: punto_venta,
            CbteTipo: cbteTipo,
            Concepto: 1, // Productos
            DocTipo: cliente_cuit ? 80 : 99, // 80 = CUIT, 99 = Consumidor Final
            DocNro: cliente_cuit ? parseInt(cliente_cuit.replace(/[-\s]/g, '')) : 0,
            CbteFch: parseInt(new Date(body.fecha || new Date()).toISOString().split('T')[0].replace(/-/g, '')), // yyyymmdd
            ImpTotal: Number(total.toFixed(2)),
            ImpTotConc: 0, // Non-taxable amount
            ImpNeto: Number(base.toFixed(2)),
            ImpOpEx: 0, // Exempt amount
            ImpIVA: Number(ivaAmount.toFixed(2)),
            ImpTrib: 0, // Other taxes
            MonId: 'PES',
            MonCotiz: 1,
            CbteDesde: nextNumber,
            CbteHasta: nextNumber
        };

        // Add IVA details if Factura A or B
        if (tipo_comprobante !== 'ticket') {
            (invoiceData as any).Iva = [{
                Id: 5, // 21% IVA
                BaseImp: Number(base.toFixed(2)),
                Importe: Number(ivaAmount.toFixed(2))
            }];
        }

        // Request CAE from AFIP
        console.log('[AFIP-API] Creating voucher in AFIP...');
        const result = await afip.ElectronicBilling.createVoucher(invoiceData);
        console.log('[AFIP-API] Voucher created successfully.');

        if (!result.CAE) {
            console.error('[AFIP-API] NO CAE RETURNED:', result);
            throw new Error('AFIP no devolvió CAE: ' + JSON.stringify(result));
        }

        // Return invoice data with CAE
        return NextResponse.json({
            success: true,
            cae: result.CAE,
            cae_vencimiento: result.CAEFchVto,
            numero_comprobante: nextNumber,
            punto_venta: punto_venta,
            tipo_comprobante: cbteTipo,
            fecha_comprobante: invoiceData.CbteFch,
            total: total,
            afip_response: result
        });

    } catch (error: any) {
        console.error('--- AFIP ERROR DETAIL ---');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        if (error.response) {
            console.error('AFIP Response Data:', error.response.data);
            console.error('AFIP Response Status:', error.response.status);
        }
        console.error('--------------------------');

        // Extract AFIP error message if available
        const errorMessage = error.message || 'Error desconocido al generar factura';
        const details = error.response?.data || error.toString();

        return NextResponse.json(
            {
                error: errorMessage,
                details: typeof details === 'object' ? JSON.stringify(details) : details,
                isAfipError: true
            },
            { status: 500 }
        );
    }
}
