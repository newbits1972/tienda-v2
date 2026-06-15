const forge = require('node-forge');
const fs = require('fs');

const CUIT = '27247669219';
const KEY_NAME = `afip_${CUIT}.key`;
const CSR_NAME = `afip_${CUIT}.csr`;
const CN = `AFIP_WS_${CUIT}`;

console.log('Generando pares de claves RSA (esto puede tomar unos segundos)...');

// 1. Generate Key Pair
const keys = forge.pki.rsa.generateKeyPair(2048);
const privateKey = keys.privateKey;
const publicKey = keys.publicKey;

// Convert Private Key to PEM format
const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
fs.writeFileSync(KEY_NAME, privateKeyPem);
console.log(`✅ Clave privada guardada en: ${KEY_NAME}`);

// 2. Create CSR
const csr = forge.pki.createCertificationRequest();
csr.publicKey = publicKey;

// Subject
// Note: O is typically the Person Name for single CUITs, but AFIP is flexible as long as serialNumber is correct.
// We'll use a generic "DataSense User" or blank if possible, but let's stick to standard practice.
csr.setSubject([
    {
        name: 'commonName',
        value: CN
    },
    {
        name: 'countryName',
        value: 'AR'
    },
    {
        name: 'organizationName',
        value: `Usuario CUIT ${CUIT}`
    },
    {
        name: 'serialNumber',
        value: `CUIT ${CUIT}`
    }
]);

// Sign CSR with Private Key
csr.sign(privateKey);

// Convert CSR to PEM format
const csrPem = forge.pki.certificationRequestToPem(csr);
fs.writeFileSync(CSR_NAME, csrPem);
console.log(`✅ Solicitud CSR guardada en: ${CSR_NAME}`);

console.log('\n=======================================');
console.log('LISTO! Archivos generados correctamente.');
console.log('=======================================\n');
