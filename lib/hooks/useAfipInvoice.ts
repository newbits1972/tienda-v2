/**
 * AFIP Integration Guide for POS Checkout
 * 
 * This file shows how to integrate AFIP electronic invoicing into your POS checkout flow.
 * 
 * STEP 1: Import the AFIP API caller
 */

import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';

/**
 * STEP 2: Hook to generate AFIP invoice
 * Use this in your POS component
 */
export function useAfipInvoice() {
    const { tenantId } = useTenant();

    const generateAfipInvoice = async (saleData: {
        tipo_comprobante: 'factura_a' | 'factura_b' | 'ticket';
        cliente_cuit?: string;
        cliente_nombre: string;
        total: number;
        fecha: Date;
        items: any[];
    }) => {
        // Only call AFIP for Factura A or B (not tickets)
        if (saleData.tipo_comprobante === 'ticket') {
            return {
                success: true,
                cae: null,
                numero_comprobante: null
            };
        }

        try {
            const response = await fetch('/api/afip/generate-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId,
                    ...saleData,
                    fecha: saleData.fecha.toISOString().split('T')[0]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error en AFIP');
            }

            const result = await response.json();

            return {
                success: true,
                cae: result.cae,
                cae_vencimiento: result.cae_vencimiento,
                numero_comprobante: result.numero_comprobante,
                punto_venta: result.punto_venta
            };

        } catch (error: any) {
            console.error('AFIP Error:', error);
            toast.error('Error al generar CAE de AFIP: ' + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    };

    return { generateAfipInvoice };
}

/**
 * STEP 3: Example integration in checkout handler
 * 
 * Replace your current checkout function with something like this:
 */
export async function handleCheckoutWithAfip(
    paymentMethod: any,
    invoiceType: 'factura_a' | 'factura_b' | 'ticket',
    customerId: string | undefined,
    cart: any[],
    total: number,
    customer: any,
    generateAfipInvoice: ReturnType<typeof useAfipInvoice>['generateAfipInvoice']
) {
    // Step 1: Generate AFIP invoice if needed
    const afipResult = await generateAfipInvoice({
        tipo_comprobante: invoiceType,
        cliente_cuit: customer?.dni_cuit,
        cliente_nombre: customer?.nombre || 'Consumidor Final',
        total,
        fecha: new Date(),
        items: cart
    });

    // Step 2: If AFIP failed and it's a fiscal invoice, abort
    if (!afipResult.success && invoiceType !== 'ticket') {
        return; // Don't complete sale without CAE
    }

    // Step 3: Save sale to Firestore with AFIP data
    const saleData = {
        items: cart,
        total,
        metodo_pago: paymentMethod,
        tipo_comprobante: invoiceType,
        cliente_id: customerId,
        fecha: new Date(),
        // AFIP fields
        cae: afipResult.cae,
        cae_vencimiento: afipResult.cae_vencimiento,
        numero_comprobante: afipResult.numero_comprobante,
        punto_venta: afipResult.punto_venta
    };

    // Save to Firestore (your existing logic)
    // await saveSale(saleData);

    // Step 4: Print thermal receipt with CAE
    // printReceipt(saleData);

    toast.success(afipResult.cae
        ? `Venta completada - CAE: ${afipResult.cae}`
        : 'Venta completada');
}

/**
 * STEP 4: Usage in POS component
 * 
 * const { generateAfipInvoice } = useAfipInvoice();
 * 
 * const handleCheckout = async (paymentMethod, invoiceType, customerId) => {
 *     const customer = customers.find(c => c.id === customerId);
 *     await handleCheckoutWithAfip(
 *         paymentMethod,
 *         invoiceType,
 *         customerId,
 *         cart,
 *         total,
 *         customer,
 *         generateAfipInvoice
 *     );
 * };
 */
