import Afip from '@afipsdk/afip.js';
import fs from 'fs';
import path from 'path';

// Define Interface for Invoice Data
interface InvoiceData {
    cantReg: number; // Cantidad de registros (generalmente 1)
    ptoVta: number;  // Punto de venta
    cbteTipo: number; // Tipo de comprobante (6 = Factura B, 11 = Factura C, etc.)
    concepto: number; // 1 = Productos, 2 = Servicios, 3 = Productos y Servicios
    docTipo: number; // 80 = CUIT, 99 = Consumidor Final
    docNro: number;  // Número de documento del comprador (0 para consumidor final)
    cbteFch: number; // Fecha del comprobante (yyyymmdd)
    impTotal: number; // Importe total
    impTotConc: number; // Importe neto no gravado
    impNeto: number; // Importe neto gravado
    impOpEx: number; // Importe exento
    impIVA: number; // Importe IVA
    impTrib: number; // Importe tributos
    monId: string; // Moneda ('PES')
    monCotiz: number; // Cotización (1 para pesos)
}

/**
 * Creates an instance of the AFIP SDK with the specific configuration for a Tenant.
 * In a real SaaS, credentials should be retrieved from a secure storage (Secret Manager / Firestore),
 * not local files. For this phase (Testing), we use local files.
 */
export const createAfipClient = (cuit: number, certName: string, keyName: string, production: boolean = false) => {
    // Determine paths (Adjust based on where files are stored)
    // In Next.js, reading from root in runtime can be tricky in Vercel, but works locally.
    const certPath = path.resolve(process.cwd(), certName);
    const keyPath = path.resolve(process.cwd(), keyName);

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        throw new Error(`Certificado o Key no encontrados en: ${certPath}`);
    }

    const afip = new Afip({
        CUIT: cuit,
        cert: fs.readFileSync(certPath, 'utf8'),
        key: fs.readFileSync(keyPath, 'utf8'),
        production: production,
        res_folder: path.resolve(process.cwd(), 'tmp/afip_data') // Use a temp folder for token cache
    });

    return afip;
};

/**
 * Gets the last voucher number for a specific sales point and voucher type.
 */
export const getLastVoucherNumber = async (afip: any, ptoVta: number, cbteTipo: number) => {
    try {
        const result = await afip.ElectronicBilling.getLastVoucher(ptoVta, cbteTipo);
        return result;
    } catch (error) {
        console.error('Error getting last voucher:', error);
        throw error;
    }
};

/**
 * Gets the server status (dummy check).
 */
export const getServerStatus = async (afip: any) => {
    try {
        return await afip.ElectronicBilling.getServerStatus();
    } catch (error) {
        console.error("Error checking server status", error);
        throw error;
    }
}
