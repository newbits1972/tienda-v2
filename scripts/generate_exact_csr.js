const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

function generate(cuit, commonName, fileName) {
    console.log(`Generating CSR for CN: ${commonName}...`);
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;
    csr.setSubject([
        { name: 'commonName', value: commonName },
        { name: 'countryName', value: 'AR' },
        { name: 'organizationName', value: commonName },
        { type: '2.5.4.5', value: `CUIT ${cuit}` }
    ]);
    csr.sign(keys.privateKey);
    const csrPem = forge.pki.certificationRequestToPem(csr);

    fs.writeFileSync(path.join(process.cwd(), `${fileName}.key`), privateKeyPem);
    fs.writeFileSync(path.join(process.cwd(), `${fileName}.csr`), csrPem);
    console.log(`Saved: ${fileName}.key and ${fileName}.csr`);
    console.log('\n--- CSR PEM ---\n');
    console.log(csrPem);
}

const cuit = '27247669219';

// Based on the screenshot: Alias is datasenseTest but DN shows CN=datasensetest (all lowercase)
generate(cuit, 'datasensetest', 'afip_final_fix');
