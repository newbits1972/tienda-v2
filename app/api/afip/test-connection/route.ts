import { NextRequest, NextResponse } from 'next/server';
import { testAfipConnection, getAfipCredentials } from '@/lib/fiscal/afipFirestore';
import { getCertificateInfo, verifyCertKeyMatch } from '@/lib/fiscal/certUtils';

/**
 * GET /api/afip/test-connection?tenantId=xxx
 * Tests the AFIP connection and WSAA authentication
 */
export async function GET(request: NextRequest) {
    let tenantId = 'unknown';
    try {
        const { searchParams } = new URL(request.url);
        tenantId = searchParams.get('tenantId') || 'default_store';

        console.log(`[AFIP-TEST] testing connection for tenant: ${tenantId}`);

        const credentials = await getAfipCredentials(tenantId);

        // 1. Check Certificate Info
        const certInfo = getCertificateInfo(credentials.cert);

        // 2. CHECK IF CERT AND KEY MATCH (CRITICAL)
        const match = verifyCertKeyMatch(credentials.cert, credentials.key);

        if (!match) {
            return NextResponse.json({
                success: false,
                error: 'Mismatched Credentials',
                message: 'El Certificado (.crt) no coincide con la Clave Privada (.key). Aseg\u00fate de subir los archivos que se generaron juntos.',
                certInfo,
                isAfipError: false,
                details: { match: false }
            }, { status: 400 });
        }

        // 3. Check Environment Match (CRITICAL)
        const detectedEnv = (certInfo as any).detectedEnv;
        const configEnv = credentials.production ? 'production' : 'homologation';
        const envMatch = detectedEnv === configEnv || detectedEnv === 'unknown';

        if (!envMatch) {
            return NextResponse.json({
                success: false,
                error: 'Environment Mismatch',
                message: `Tu certificado es de ${detectedEnv.toUpperCase()} pero el sistema est\u00e1 en modo ${configEnv.toUpperCase()}.`,
                hint: `Activa/Desactiva el switch "Modo Producci\u00f3n" para que coincida con tu certificado.`,
                certInfo,
                details: { match: true, envMatch: false }
            }, { status: 400 });
        }

        // 4. Check CUIT match
        const certCuit = (certInfo as any).subject?.serialNumber || '';
        const providedCuit = credentials.cuit.toString();
        const cuitMatch = certCuit.includes(providedCuit);

        if (!cuitMatch && providedCuit !== '0') {
            return NextResponse.json({
                success: false,
                error: 'CUIT Mismatch',
                message: `El CUIT del certificado (${certCuit}) no coincide con el ingresado (${providedCuit}).`,
                certInfo,
                details: { match: true, envMatch: true, cuitMatch: false }
            }, { status: 400 });
        }

        // 5. Try AFIP connection
        const status = await testAfipConnection(tenantId);

        return NextResponse.json({
            success: true,
            message: 'Conexi\u00f3n con AFIP exitosa',
            certInfo,
            status,
            serverTime: new Date().toISOString(),
            details: { match: true, cuitMatch }
        });

    } catch (error: any) {
        console.error('[AFIP-TEST] Error:', error);

        // Try to get cert info for fallback info
        let fallbackCertInfo = null;
        try {
            const credentials = await getAfipCredentials(tenantId);
            fallbackCertInfo = getCertificateInfo(credentials.cert);
        } catch (e) { }

        let detailedError = error.message;
        if (error.response && error.response.data) {
            detailedError = typeof error.response.data === 'string'
                ? error.response.data
                : JSON.stringify(error.response.data);
        }

        const isAuthError = detailedError.includes('401') || detailedError.includes('Unauthorized') || error.code === 401;

        return NextResponse.json({
            success: false,
            error: isAuthError ? 'Fallo de Autorizaci\u00f3n' : 'Fallo de autenticaci\u00f3n',
            message: detailedError,
            certInfo: fallbackCertInfo,
            serverTime: new Date().toISOString(),
            code: error.code || error.status || 500,
            isAfipError: true,
            hint: isAuthError
                ? 'El certificado es v\u00e1lido pero AFIP dice que no ten\u00e9s permiso para usar el servicio "wsfe". Ten\u00e9s que "Delegar el servicio" en el Administrador de Relaciones de AFIP.'
                : 'Verifica que el modo (Homologaci\u00f3n/Producci\u00f3n) coincida con tu certificado.'
        }, { status: 500 });
    }
}
