import { db } from './config';
import { collection, addDoc, Timestamp, getDocs, deleteDoc, query, where } from 'firebase/firestore';

const sampleProducts = [
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

const sampleCustomers = [
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
    },
    {
        nombre: 'María García',
        dni_cuit: '27-25123456-8',
        telefono: '11 5566-7788',
        email: 'maria.garcia@email.com',
        direccion: 'Belgrano 567, Morón',
        saldo_cuenta_corriente: 0,
        limite_credito: 30000,
        activo: true,
    }
];

export async function seedDatabase(tenantId: string) {
    console.log(`Starting database seed for tenant: ${tenantId}...`);

    try {
        // Seed Products
        const productsCol = collection(db, 'products');
        for (const product of sampleProducts) {
            await addDoc(productsCol, {
                ...product,
                tenantId,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
            });
        }
        console.log('Products seeded successfully');

        // Seed Customers
        const customersCol = collection(db, 'customers');
        for (const customer of sampleCustomers) {
            await addDoc(customersCol, {
                ...customer,
                tenantId,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
            });
        }
        console.log('Customers seeded successfully');

        return { success: true };
    } catch (error) {
        console.error('Error seeding database:', error);
        throw error;
    }
}

export async function clearDatabase(tenantId: string) {
    console.log(`Clearing database for tenant: ${tenantId}...`);

    const collections = ['products', 'customers', 'sales'];

    for (const colName of collections) {
        const q = query(collection(db, colName), where('tenantId', '==', tenantId));
        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log(`Collection ${colName} cleared for tenant ${tenantId}`);
    }
}
