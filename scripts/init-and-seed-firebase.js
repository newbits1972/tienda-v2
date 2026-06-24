const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Ubicación del archivo de cuenta de servicio
const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: No se encontró el archivo firebase-service-account.json.');
    console.error('Por favor, asegúrate de haber subido y guardado el archivo de credenciales de la Cuenta de Servicio.');
    process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Datos semilla de ejemplo para Retail e Indumentaria
const MOCK_PRODUCTS = [
    {
        nombre: 'Remera de Algodón Básica',
        codigo_barras: '7791234560012',
        categoria: 'Remeras',
        marca: 'DataSense Active',
        material: '100% Algodón',
        genero: 'unisex',
        temporada: 'Verano 26',
        precio_costo: 3500,
        precio_venta: 7900,
        stock_actual: 45,
        stock_minimo: 10,
        stock_controlado: true,
        talles_disponibles: ['S', 'M', 'L', 'XL'],
        colores_disponibles: [
            { nombre: 'Negro', hex: '#000000' },
            { nombre: 'Blanco', hex: '#FFFFFF' },
            { nombre: 'Gris Melange', hex: '#BEBEBE' }
        ],
        activo: true,
        disponible: true,
    },
    {
        nombre: 'Pantalón Jean Slim Fit',
        codigo_barras: '7791234560029',
        categoria: 'Pantalones',
        marca: 'DataSense Denim',
        material: 'Denim Elastizado',
        genero: 'hombre',
        temporada: 'Colección Permanente',
        precio_costo: 8500,
        precio_venta: 18900,
        stock_actual: 28,
        stock_minimo: 5,
        stock_controlado: true,
        talles_disponibles: ['38', '40', '42', '44', '46'],
        colores_disponibles: [
            { nombre: 'Azul Localizado', hex: '#1E3A8A' },
            { nombre: 'Negro Gastado', hex: '#1F2937' }
        ],
        activo: true,
        disponible: true,
    },
    {
        nombre: 'Zapatillas Running Pro',
        codigo_barras: '7791234560036',
        categoria: 'Calzado',
        marca: 'RunSport',
        material: 'Malla Poliéster / Goma',
        genero: 'unisex',
        temporada: 'Invierno 26',
        precio_costo: 18000,
        precio_venta: 39900,
        stock_actual: 15,
        stock_minimo: 3,
        stock_controlado: true,
        talles_disponibles: ['39', '40', '41', '42', '43', '44'],
        colores_disponibles: [
            { nombre: 'Negro / Rojo', hex: '#991B1B' },
            { nombre: 'Azul / Blanco', hex: '#2563EB\'' }
        ],
        activo: true,
        disponible: true,
    },
    {
        nombre: 'Campera de Abrigo Impermeable',
        codigo_barras: '7791234560043',
        categoria: 'Abrigos',
        marca: 'NorthShield',
        material: 'Poliéster con Relleno Térmico',
        genero: 'mujer',
        temporada: 'Invierno 26',
        precio_costo: 22000,
        precio_venta: 48900,
        stock_actual: 8,
        stock_minimo: 2,
        stock_controlado: true,
        talles_disponibles: ['S', 'M', 'L'],
        colores_disponibles: [
            { nombre: 'Verde Militar', hex: '#3F6212' },
            { nombre: 'Negro Mate', hex: '#111827' }
        ],
        activo: true,
        disponible: true,
    }
];

const MOCK_CUSTOMERS = [
    {
        nombre: 'Consumidor Final',
        dni_cuit: '',
        telefono: '',
        email: '',
        direccion: '',
        saldo_cuenta_corriente: 0,
        limite_credito: 0,
        activo: true,
    },
    {
        nombre: 'Juan Pérez',
        dni_cuit: '20-30456789-5',
        telefono: '11 4455-6677',
        email: 'juan.perez@email.com',
        direccion: 'Av. Corrientes 1234, CABA',
        saldo_cuenta_corriente: -1500,
        limite_credito: 50000,
        activo: true,
    }
];

// Generar Token de Acceso de Google Cloud para administrar Firestore
function getGCPToken() {
    return new Promise((resolve, reject) => {
        const header = { alg: 'RS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: sa.client_email,
            scope: 'https://www.googleapis.com/auth/cloud-platform',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        };
        
        const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signatureInput = `${base64Header}.${base64Payload}`;
        
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(signatureInput);
        const signature = sign.sign(sa.private_key, 'base64url');
        
        const jwt = `${signatureInput}.${signature}`;
        const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;
        
        const req = https.request('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.access_token) {
                        resolve(response.access_token);
                    } else {
                        reject(new Error('No se pudo obtener access token de GCP: ' + JSON.stringify(response)));
                    }
                } catch (e) {
                    reject(new Error('Error decodificando respuesta OAuth: ' + data));
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Crear la base de datos predeterminada de Firestore en GCP
function createFirestoreDatabase(accessToken) {
    return new Promise((resolve, reject) => {
        // Configuramos la ubicación en us-central por ser el estándar gratuito y confiable
        const postData = JSON.stringify({
            locationId: 'us-central',
            type: 'FIRESTORE_NATIVE',
            concurrencyMode: 'OPTIMISTIC'
        });
        
        const options = {
            hostname: 'firestore.googleapis.com',
            path: `/v1/projects/${sa.project_id}/databases?databaseId=%28default%29`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        console.log(`\n⚙️ Intentando crear/aprovisionar base de datos Firestore en el proyecto "${sa.project_id}"...`);
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log('✅ Solicitud de creación de base de datos enviada con éxito.');
                    resolve(true); // Se está creando
                } else if (res.statusCode === 409) {
                    console.log('ℹ️ La base de datos de Firestore ya existe en este proyecto.');
                    resolve(false); // Ya existía
                } else {
                    let errMsg = data;
                    try {
                        const parsed = JSON.parse(data);
                        errMsg = parsed.error ? parsed.error.message : data;
                    } catch (e) {}
                    reject(new Error(`Error en la API de Firestore Admin (${res.statusCode}): ${errMsg}`));
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Función principal
async function run() {
    try {
        console.log('🚀 Iniciando proceso de conexión e inicialización de Firebase...');
        
        // 1. Obtener Token
        const token = await getGCPToken();
        console.log('🔑 Token de acceso de Google Cloud generado correctamente.');
        
        // 2. Intentar crear base de datos Firestore
        try {
            const seEstaCreando = await createFirestoreDatabase(token);
            if (seEstaCreando) {
                console.log('⏳ Esperando 15 segundos para permitir que Google Cloud inicialice Firestore...');
                await new Promise(resolve => setTimeout(resolve, 15000));
            }
        } catch (apiError) {
            console.warn('\n⚠️ Advertencia: No se pudo auto-crear la base de datos Firestore desde la API.');
            console.warn('Detalle:', apiError.message);
            console.warn('Esto es normal si tu cuenta de servicio no tiene el rol de Administrador de GCP.');
            console.warn('Procederemos con la conexión de administración directa (asumiendo que ya creaste Firestore en la consola de Firebase).\n');
        }
        
        // 3. Inicializar firebase-admin
        console.log('\n📦 Conectando SDK de Administración de Firebase...');
        admin.initializeApp({
            credential: admin.cert(sa)
        });
        
        const db = getFirestore();
        const tenantId = 'default_store';
        
        // 4. Crear configuración de tienda
        console.log('1️⃣ Configurando tienda "default_store"...');
        const storeRef = db.collection('store_configs').doc(tenantId);
        await storeRef.set({
            nombre: 'TiendaLink',
            razonSocial: 'TiendaLink Retail S.A.',
            cuit: '30-11223344-9',
            direccion: 'Sede Central',
            telefono: '1122334455',
            whatsapp: '541122334455',
            rubro: 'Retail & Indumentaria',
            alias: 'tienda.link',
            cbu: '0000003100000000000000',
            active: true,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
            modules: {
                afip_fiscal: true,
                integrated_pos: true,
                multi_branch: false,
                ecommerce: true
            }
        });
        console.log('✅ Configuración de tienda creada.');

        // 5. Sembrar productos
        console.log('2️⃣ Sembrando productos de prueba (Indumentaria)...');
        for (const product of MOCK_PRODUCTS) {
            const productRef = db.collection('products').doc();
            await productRef.set({
                ...product,
                tenantId,
                created_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp()
            });
        }
        console.log('✅ Productos sembrados.');

        // 6. Sembrar clientes
        console.log('3️⃣ Sembrando clientes de prueba...');
        for (const customer of MOCK_CUSTOMERS) {
            const customerRef = db.collection('customers').doc();
            await customerRef.set({
                ...customer,
                tenantId,
                created_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp()
            });
        }
        console.log('✅ Clientes sembrados.');
        
        console.log('\n🎉 ¡Proceso finalizado con éxito! La base de datos ha sido creada e inicializada.');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Ocurrió un error durante la ejecución del script:');
        console.error(error.message || error);
        process.exit(1);
    }
}

run();
