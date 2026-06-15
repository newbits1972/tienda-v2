import { db } from '../firebase/config';
import { collection, addDoc, getDocs, query, limit, Timestamp } from 'firebase/firestore';

const MOCK_PRODUCTS = [
    {
        nombre: 'Jamón Cocido Premium',
        codigo_barras: '2000010000000',
        categoria: 'Fiambres',
        precio_costo: 4500,
        precio_venta: 8900,
        stock_actual: 5.5,
        stock_minimo: 2,
        es_pesable: true,
        unidad: 'kg',
        activo: true,
    },
    {
        nombre: 'Queso Tybo Holanda',
        codigo_barras: '2000020000000',
        categoria: 'Quesos',
        precio_costo: 3800,
        precio_venta: 7200,
        stock_actual: 12.3,
        stock_minimo: 5,
        es_pesable: true,
        unidad: 'kg',
        activo: true,
    },
    {
        nombre: 'Salame de Milán',
        codigo_barras: '2000030000000',
        categoria: 'Embutidos',
        precio_costo: 5200,
        precio_venta: 9500,
        stock_actual: 3.2,
        stock_minimo: 1.5,
        es_pesable: true,
        unidad: 'kg',
        activo: true,
    },
    {
        nombre: 'Mortadela con Pistacho',
        codigo_barras: '2000040000000',
        categoria: 'Fiambres',
        precio_costo: 3200,
        precio_venta: 6400,
        stock_actual: 2.8,
        stock_minimo: 1,
        es_pesable: true,
        unidad: 'kg',
        activo: true,
    },
    {
        nombre: 'Pan de Campo',
        codigo_barras: '7791234567890',
        categoria: 'Almacén',
        precio_costo: 800,
        precio_venta: 1500,
        stock_actual: 20,
        stock_minimo: 5,
        es_pesable: false,
        unidad: 'unidad',
        activo: true,
    },
    {
        nombre: 'Aceitunas Verdes Premium',
        codigo_barras: '7798765432109',
        categoria: 'Almacén',
        precio_costo: 1200,
        precio_venta: 2800,
        stock_actual: 15,
        stock_minimo: 3,
        es_pesable: false,
        unidad: 'unidad',
        activo: true,
    }
];

const MOCK_CUSTOMERS = [
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

export async function seedDatabase() {
    try {
        // Check if there are already products to avoid double seeding
        const productsSnapshot = await getDocs(query(collection(db, 'products'), limit(1)));
        if (!productsSnapshot.empty) {
            console.log('Database already has products, skipping seed.');
            return { success: false, message: 'La base de datos ya tiene información.' };
        }

        // Seed Products
        for (const product of MOCK_PRODUCTS) {
            await addDoc(collection(db, 'products'), {
                ...product,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
            });
        }

        // Seed Customers
        for (const customer of MOCK_CUSTOMERS) {
            await addDoc(collection(db, 'customers'), {
                ...customer,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
            });
        }

        console.log('Seeding completed successfully');
        return { success: true, message: 'Datos de prueba cargados exitosamente.' };
    } catch (error) {
        console.error('Error seeding database:', error);
        return { success: false, message: 'Error al cargar datos.' };
    }
}
