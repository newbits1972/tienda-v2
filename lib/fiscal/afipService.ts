import { validateCUIT as validateUtilsCUIT } from '@/lib/utils';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, Transaction } from 'firebase/firestore';
import { runTransaction } from 'firebase/firestore';

/**
 * Validates Argentine CUIT format
 * Proxy to utils version for consistency
 */
export function validateCUIT(cuit: string): boolean {
    return validateUtilsCUIT(cuit);
}

/**
 * Formats CUIT with dashes
 */
export function formatCUIT(cuit: string): string {
    const clean = cuit.replace(/[-\s]/g, '');
    if (clean.length !== 11) return cuit;
    return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
}

/**
 * Calculates IVA (VAT) details
 * Returns base, rate, and amount
 */
export function calculateIVADetails(amount: number, ivaRate: 21 | 10.5 = 21) {
    const base = amount / (1 + ivaRate / 100);
    const ivaAmount = amount - base;
    return {
        base: Number(base.toFixed(2)),
        ivaAmount: Number(ivaAmount.toFixed(2)),
        rate: ivaRate
    };
}

/**
 * Gets next invoice number for a given type using a Firestore transaction
 */
export async function getNextInvoiceNumber(
    transaction: any, // Use any or Transaction if imported correctly
    type: 'factura_a' | 'factura_b' | 'ticket',
    puntoVenta: number = 1
): Promise<number> {
    const fiscalRef = doc(db, 'settings', 'fiscal');
    const fiscalSnap = await transaction.get(fiscalRef);

    let currentData = fiscalSnap.exists() ? fiscalSnap.data() : {
        last_factura_a: 0,
        last_factura_b: 0,
        last_ticket: 0,
        punto_venta: puntoVenta
    };

    const fieldMap = {
        'factura_a': 'last_factura_a',
        'factura_b': 'last_factura_b',
        'ticket': 'last_ticket'
    };

    const field = fieldMap[type] || 'last_ticket';
    const nextNumber = (currentData[field] || 0) + 1;

    transaction.set(fiscalRef, {
        [field]: nextNumber
    }, { merge: true });

    return nextNumber;
}

/**
 * Generates CAE (Código de Autorización Electrónico)
 * In production, this must call AFIP's WSFE service
 */
export async function generateCAE(invoiceData: {
    tipo: 'factura_a' | 'factura_b' | 'ticket';
    puntoVenta: number;
    numero: number;
    fecha: Date;
    total: number;
    cuit?: string;
}): Promise<{ cae: string; vencimiento: Date }> {
    // Artificial delay to simulate network call
    await new Promise(resolve => setTimeout(resolve, 800));

    // Refined CAE: 14 digits starting with some logic
    // Usually starts with an identifier, for mock let's use a standard-like prefix
    const prefix = invoiceData.tipo === 'factura_a' ? '21' : (invoiceData.tipo === 'factura_b' ? '26' : '11');
    const randomSuffix = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    const mockCAE = (prefix + randomSuffix).slice(0, 14);

    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 10);

    return {
        cae: mockCAE,
        vencimiento,
    };
}

/**
 * Generates QR data for fiscal receipts
 * Format according to AFIP specifications (JSON Base64)
 */
export function generateQRData(invoiceData: {
    cuit: string;
    puntoVenta: number;
    tipo: 'A' | 'B' | 'T';
    numero: number;
    total: number;
    fecha: string;
    cae?: string;
    receptor_cuit?: string;
}): string {
    // AFIP QR format (Simplified but includes documents)
    const qrData = {
        ver: 1,
        fecha: invoiceData.fecha,
        cuit: parseInt(invoiceData.cuit.replace(/[-\s]/g, '')),
        ptoVta: invoiceData.puntoVenta,
        tipoCmp: invoiceData.tipo === 'A' ? 1 : (invoiceData.tipo === 'B' ? 6 : 11),
        nroCmp: invoiceData.numero,
        importe: Number(invoiceData.total.toFixed(2)),
        moneda: 'PES',
        ctz: 1,
        tipoDocRec: invoiceData.receptor_cuit ? 80 : 99,
        nroDocRec: invoiceData.receptor_cuit ? parseInt(invoiceData.receptor_cuit.replace(/[-\s]/g, '')) : 0,
        tipoCodAut: 'E',
        codAut: invoiceData.cae ? parseInt(invoiceData.cae) : 0,
    };

    try {
        const jsonString = JSON.stringify(qrData);
        return btoa(jsonString);
    } catch (e) {
        console.error('Error generating QR data:', e);
        return '';
    }
}
