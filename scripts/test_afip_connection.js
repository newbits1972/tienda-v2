const Afip = require('@afipsdk/afip.js');
const fs = require('fs');
const path = require('path');

// CONFIGURATION
const CUIT = 27247669219;
const CERT_NAME = 'datasenseTest_3c44f3f941176dbf.crt';
const KEY_NAME = 'afip_27247669219.key';

async function testConnection() {
    console.log('--- Iniciando prueba de conexión con AFIP (Homologación) ---');

    try {
        const certPath = path.resolve(__dirname, '..', CERT_NAME);
        const keyPath = path.resolve(__dirname, '..', KEY_NAME);

        console.log('Leyendo credenciales...');
        if (!fs.existsSync(certPath)) throw new Error(`Falta certificado: ${certPath}`);
        if (!fs.existsSync(keyPath)) throw new Error(`Falta clave: ${keyPath}`);

        const afip = new Afip({
            CUIT: CUIT,
            cert: fs.readFileSync(certPath, 'utf8'),
            key: fs.readFileSync(keyPath, 'utf8'),
            production: true, // Changing to TRUE to test if this is a Production certificate
            res_folder: path.resolve(__dirname, '..', 'tmp')
        });

        console.log('Conectando con WSFE (Facturación Electrónica)...');

        // Check Server Status
        const status = await afip.ElectronicBilling.getServerStatus();
        console.log('✅ Estado del Servidor:', status);

        // Check Last Voucher for Pto Venta 1, Ticket (83) or Factura B (6)
        // Note: Punto de Venta needs to exist in AFIP testing env. usually 1 is safe to check if it exists or returns error.
        console.log('Consultando último comprobante (Pto Venta 1, Tipo 6 - Factura B)...');
        const lastVoucher = await afip.ElectronicBilling.getLastVoucher(1, 6);
        console.log('✅ Último comprobante:', lastVoucher);

    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        if (error.code) console.error('Codigo:', error.code);
        // Dump full object if needed
        // console.error(JSON.stringify(error, null, 2));
    }
}

testConnection();
