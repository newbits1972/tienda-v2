const forge = require('node-forge');

/**
 * Parses PEM certificate and returns info
 */
export function getCertificateInfo(pem: string) {
    try {
        const cert = forge.pki.certificateFromPem(pem);
        const subject = cert.subject.attributes.reduce((acc: any, attr: any) => {
            acc[attr.name || attr.shortName] = attr.value;
            return acc;
        }, {});

        const issuer = cert.issuer.attributes.reduce((acc: any, attr: any) => {
            acc[attr.name || attr.shortName] = attr.value;
            return acc;
        }, {});

        const issuerCommonName = issuer['commonName'] || '';
        const issuerOrg = issuer['organizationName'] || '';

        // AFIP Testing issuers usually are "Computadores" or contain "testing"
        const isHomologation = issuerCommonName.toLowerCase().includes('testing') ||
            issuerCommonName.toLowerCase().includes('computadores') ||
            issuerOrg.toLowerCase().includes('afip testing');

        const isProduction = (issuerCommonName.toLowerCase().includes('afip') ||
            issuerOrg.toLowerCase().includes('afip')) && !isHomologation;

        return {
            validFrom: cert.validity.notBefore,
            validTo: cert.validity.notAfter,
            subject,
            issuer,
            serialNumber: cert.serialNumber,
            detectedEnv: isProduction ? 'production' : (isHomologation ? 'homologation' : 'unknown'),
            issuerName: issuerCommonName
        };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * Verifies if a certificate and a private key match
 */
export function verifyCertKeyMatch(certPem: string, keyPem: string): boolean {
    try {
        const cert = forge.pki.certificateFromPem(certPem);
        const privateKey = forge.pki.privateKeyFromPem(keyPem);

        // Extract public key from cert
        const certPubKeyPem = forge.pki.publicKeyToPem(cert.publicKey);

        // Extract public key from private key
        const keyPubKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);
        const keyPubKeyPem = forge.pki.publicKeyToPem(keyPubKey);

        return certPubKeyPem === keyPubKeyPem;
    } catch (e) {
        console.error('Error matching cert/key:', e);
        return false;
    }
}
