import { ScaleBarcodeData } from '@/lib/types';

/**
 * Parses EAN-13 barcodes from scales (balanzas)
 * Standard Argentine format:
 * - Position 0-1: "20" (scale identifier)
 * - Position 2-7: Product ID (6 digits)
 * - Position 8-12: Weight in grams OR price (5 digits)
 * - Position 13: Check digit
 * 
 * @param barcode - The 13-digit barcode string
 * @returns Parsed data with product ID and weight
 */
export function parseScaleBarcode(barcode: string): ScaleBarcodeData {
    const cleanBarcode = barcode.replace(/[\s-]/g, '');

    if (cleanBarcode.length !== 13 || !cleanBarcode.startsWith('20')) {
        return { isScaleCode: false };
    }

    /**
     * Standard Argentine Scale Barcode (EAN-13):
     * [20][PPPPP][VVVVV][D]
     * 20: Prefix
     * PPPPP: Product SKU (usually 5 digits)
     * VVVVV: Value (either weight in grams or price in cents/pesos)
     * D: Check digit
     */
    const productId = cleanBarcode.substring(2, 7); // 5 digits SKU
    const valueString = cleanBarcode.substring(7, 12); // 5 digits value
    const value = parseInt(valueString, 10);

    // In many delicatessens, the scale is configured to output TOTAL PRICE
    // We determine this based on configuration or heuristics.
    // For now, we'll return the value and a 'hint'.
    // If the value is > 20000 (20kg), it's likely a Price in a delicatessen context.
    // However, it's safer to let the POS decide based on product type.

    return {
        isScaleCode: true,
        productId,
        weight: value, // Defaulting to value, POS will handle conversion if it's price
        price: value,  // Providing both for the POS to choose
    };
}

/**
 * Validates if a barcode is from a scale (starts with prefix 20)
 */
export function isScaleBarcode(barcode: string): boolean {
    const cleanBarcode = barcode.replace(/[\s-]/g, '');
    return cleanBarcode.length === 13 && cleanBarcode.startsWith('20');
}

/**
 * Formats product ID for scale lookup
 * Pads with zeros to match the 6-digit format
 */
export function formatProductIdForScale(productId: string): string {
    return productId.padStart(6, '0');
}
