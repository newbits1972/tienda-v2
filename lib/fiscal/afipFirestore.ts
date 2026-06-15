import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AfipCertificate } from '@/lib/types';
import Afip from '@afipsdk/afip.js';

/**
 * Gets AFIP credentials from Firestore for a given tenant
 */
export async function getAfipCredentials(tenantId: string): Promise<{
    cuit: number;
    cert: string;
    key: string;
    production: boolean;
    punto_venta: number;
}> {
    const certRef = doc(db, 'afip_certificates', tenantId);
    const certSnap = await getDoc(certRef);

    if (!certSnap.exists()) {
        throw new Error('No hay certificados AFIP configurados para este tenant');
    }

    const data = certSnap.data() as AfipCertificate;

    if (!data.activo) {
        throw new Error('Certificado AFIP desactivado');
    }

    return {
        cuit: parseInt(data.cuit.replace(/[-\s]/g, '')),
        cert: data.certificado,
        key: data.clave_privada,
        production: data.production,
        punto_venta: data.punto_venta
    };
}

/**
 * Creates an AFIP client instance from Firestore credentials
 * NO filesystem access needed - works in Vercel serverless
 */
export async function createAfipClientFromFirestore(tenantId: string) {
    const credentials = await getAfipCredentials(tenantId);

    // Ensure clean PEM format (remove possible trailing spaces/newlines from DB)
    const cleanCert = credentials.cert.trim();
    const cleanKey = credentials.key.trim();

    console.log(`[AFIP-INIT] CUIT: ${credentials.cuit}, Env: ${credentials.production ? 'PROD' : 'HOMO'}`);

    try {
        const afip = new Afip({
            CUIT: credentials.cuit,
            cert: cleanCert,
            key: cleanKey,
            production: credentials.production,
            res_folder: '/tmp'
        });

        return { afip, punto_venta: credentials.punto_venta };
    } catch (err: any) {
        console.error('[AFIP-INIT] SDK Constructor Error:', err.message);
        throw new Error(`Error al inicializar cliente AFIP: ${err.message}`);
    }
}

/**
 * Basic authentication test (WSAA)
 */
export async function testAfipConnection(tenantId: string) {
    const { afip } = await createAfipClientFromFirestore(tenantId);
    // ElectronicBilling constructor triggers authentication check if needed
    // We call getServerStatus which is a safe, no-side-effect call
    return await afip.ElectronicBilling.getServerStatus();
}
