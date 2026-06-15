import { NextRequest, NextResponse } from 'next/server';
import { getDoc, setDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AfipCertificate } from '@/lib/types';

/**
 * POST /api/afip/upload-certificate
 * Uploads AFIP certificate and private key to Firestore
 * 
 * Body: {
 *   tenantId: string,
 *   cuit: string,
 *   certificado: string (PEM content of .crt file),
 *   clave_privada: string (PEM content of .key file),
 *   punto_venta: number,
 *   production: boolean
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenantId, cuit, certificado, clave_privada, punto_venta, production } = body;

        // Validate required fields
        if (!tenantId || !cuit || !certificado || !clave_privada) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            );
        }

        // Validate certificate format (basic check)
        if (!certificado.includes('BEGIN CERTIFICATE') || !clave_privada.includes('BEGIN')) {
            return NextResponse.json(
                { error: 'Formato de certificado inv\u00e1lido' },
                { status: 400 }
            );
        }

        // Check if certificate already exists
        const certRef = doc(db, 'afip_certificates', tenantId);
        const existingCert = await getDoc(certRef);

        const now = Timestamp.now();

        const certificateData: AfipCertificate = {
            id: tenantId,
            tenantId,
            cuit,
            certificado,
            clave_privada,
            punto_venta: punto_venta || 1,
            production: production || false,
            activo: true,
            created_at: existingCert.exists() ? existingCert.data().created_at : now,
            updated_at: now
        };

        await setDoc(certRef, certificateData);

        return NextResponse.json({
            success: true,
            message: existingCert.exists()
                ? 'Certificado actualizado correctamente'
                : 'Certificado subido correctamente'
        });

    } catch (error: any) {
        console.error('Error uploading AFIP certificate:', error);
        return NextResponse.json(
            { error: 'Error al procesar certificado: ' + error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/afip/upload-certificate?tenantId=xxx
 * Gets AFIP certificate status for a tenant
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');

        if (!tenantId) {
            return NextResponse.json(
                { error: 'TenantId requerido' },
                { status: 400 }
            );
        }

        const certRef = doc(db, 'afip_certificates', tenantId);
        const certSnap = await getDoc(certRef);

        if (!certSnap.exists()) {
            return NextResponse.json({
                configured: false,
                message: 'No hay certificado configurado'
            });
        }

        const data = certSnap.data() as AfipCertificate;

        // Return certificate info without sensitive data
        return NextResponse.json({
            configured: true,
            cuit: data.cuit,
            punto_venta: data.punto_venta,
            production: data.production,
            activo: data.activo,
            fecha_vencimiento: data.fecha_vencimiento,
            updated_at: data.updated_at
        });

    } catch (error: any) {
        console.error('Error getting AFIP certificate:', error);
        return NextResponse.json(
            { error: 'Error al consultar certificado' },
            { status: 500 }
        );
    }
}
