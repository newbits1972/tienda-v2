import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Formats a number as Argentine peso currency
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(amount);
}

/**
 * Validates an Argentine CUIT/CUIL
 */
export function validateCUIT(cuit: string): boolean {
    const cleanCUIT = cuit.replace(/[^\d]/g, '');
    if (cleanCUIT.length !== 11) return false;

    const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCUIT[i]) * factors[i];
    }

    const checkDigit = parseInt(cleanCUIT[10]);
    const remainder = sum % 11;
    const computedDigit = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;

    return checkDigit === computedDigit;
}

/**
 * Generates a random EAN-13 barcode
 */
export function generateBarcode(): string {
    let barcode = '779'; // Argentina prefix
    for (let i = 0; i < 9; i++) {
        barcode += Math.floor(Math.random() * 10).toString();
    }

    // Simple checksum (last digit)
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    return barcode + checkDigit.toString();
}
/**
 * Safely converts a value to a Date object.
 * Handles Firestore Timestamps, Date objects, and ISO strings.
 */
export function toDate(date: any): Date {
    if (!date) return new Date();
    if (typeof date.toDate === 'function') return date.toDate();
    if (date instanceof Date) return date;
    if (date.seconds) return new Date(date.seconds * 1000);
    return new Date(date);
}

/**
 * Recursively removes all keys with undefined values from an object.
 * Necessary for Firestore as it doesn't support undefined.
 */
export function cleanUndefined<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date || (typeof obj === 'object' && 'seconds' in obj && 'nanoseconds' in obj)) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => cleanUndefined(item)) as unknown as T;
    }

    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = (obj as any)[key];
            if (value !== undefined) {
                newObj[key] = cleanUndefined(value);
            }
        }
    }
    return newObj as T;
}
