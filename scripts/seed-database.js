const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, addDoc, Timestamp } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno local
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('Error: No se encontró el archivo .env.local. Por favor configúralo primero.');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
        }
        env[key] = value.trim();
    }
});

const firebaseConfig = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('Conectando a Firebase con el proyecto:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
            { nombre: 'Azul / Blanco', hex: '#2563EB' }
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

async function runSeed() {
    try {
        console.log('1. Creando configuración de tienda (default_store)...');
        const tenantId = 'default_store';
        const configRef = doc(db, 'store_configs', tenantId);
        
        await setDoc(configRef, {
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
            created_at: Timestamp.now(),
            updated_at: Timestamp.now(),
            modules: {
                afip_fiscal: true,
                integrated_pos: true,
                multi_branch: false,
                ecommerce: true
            }
        });
        console.log('✅ Tienda default_store configurada.');

        console.log('2. Sembrando productos de prueba (indumentaria)...');
        const productsCol = collection(db, 'products');
        for (const product of MOCK_PRODUCTS) {
            await addDoc(productsCol, {
                ...product,
                tenantId,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
            });
        }
        console.log('✅ Productos sembrados.');

        console.log('3. Sembrando clientes de prueba...');
        const customersCol = collection(db, 'customers');
        for (const customer of MOCK_CUSTOMERS) {
            await addDoc(customersCol, {
                ...customer,
                tenantId,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
            });
        }
        console.log('✅ Clientes sembrados.');
        console.log('🎉 Inicialización de Firebase finalizada con éxito.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error durante la siembra de la base de datos:', err.message || err);
        console.error('\nIMPORTANTE: Asegúrate de haber entrado a Firebase Console y haber creado la base de datos de "Firestore Database" (en modo de prueba). De lo contrario, Firebase rechazará la conexión.');
        process.exit(1);
    }
}

runSeed();
