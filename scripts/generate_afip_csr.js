const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

function generateAfipCredentials(cuit, alias) {
    console.log(`Generating credentials for CUIT: ${cuit}, Alias: ${alias}...`);

    try {
        const keys = forge.pki.rsa.generateKeyPair(2048);
        const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);

        const csr = forge.pki.createCertificationRequest();
        csr.publicKey = keys.publicKey;

        csr.setSubject([
            { name: 'commonName', value: alias },
            { name: 'countryName', value: 'AR' },
            { name: 'organizationName', value: alias },
            { type: '2.5.4.5', value: `CUIT ${cuit}` } // serialNumber OID
        ]);

        csr.sign(keys.privateKey);

        const csrPem = forge.pki.certificationRequestToPem(csr);

        const keyPath = path.join(process.cwd(), `afip_datasenseTest.key`);
        const csrPath = path.join(process.cwd(), `afip_datasenseTest.csr`);

        fs.writeFileSync(keyPath, privateKeyPem);
        fs.writeFileSync(csrPath, csrPem);

        console.log('--- GENERATION SUCCESS ---');
        console.log('KEY SAVED:', keyPath);
        console.log('CSR SAVED:', csrPath);
        console.log('\n--- NEW CSR PEM ---\n');
        console.log(csrPem);
        console.log('\n--- END CSR ---\n');
    } catch (e) {
        console.error('ERROR GENERATING CREDENTIALS:', e);
    }
}

// MATCHING THE CASE-SENSITIVE ALIAS FROM YOUR LATEST IMAGE
const cuit = '27247669219';
const alias = 'datasenseTest';

generateAfipCredentials(cuit, alias);
