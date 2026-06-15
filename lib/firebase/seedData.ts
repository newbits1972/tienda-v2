import { db } from './config';
import { collection, addDoc, Timestamp, getDocs, deleteDoc, query, where } from 'firebase/firestore';

const sampleProducts = [
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
