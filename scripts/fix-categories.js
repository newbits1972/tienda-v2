require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function fixCategories() {
    console.log('Inicializando Firebase con project ID:', firebaseConfig.projectId);
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('🔍 Buscando productos en categoría "fiambres"...');

    const q1 = query(collection(db, 'products'), where('categoria', '==', 'fiambres'));
    const q2 = query(collection(db, 'products'), where('categoria', '==', 'Fiambres'));

    try {
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const docs = [...snap1.docs, ...snap2.docs];

        if (docs.length === 0) {
            console.log('✅ No se encontraron productos en la categoría "fiambres".');
            return;
        }

        console.log(`📦 Encontrados ${docs.length} productos para migrar.`);

        const batch = writeBatch(db);
        docs.forEach(d => {
            const product = d.data();
            const ref = doc(db, 'products', d.id);
            console.log(`Migrando: ${product.nombre} (${d.id}) -> Fiambrería`);
            // Usamos "Fiambrería" con acento si esa es la convención que quieres, o sin
            batch.update(ref, { categoria: 'Fiambrería' });
        });

        await batch.commit();
        console.log('✅ Migración completada exitosamente.');
    } catch (error) {
        console.error('Error durante la migración:', error);
    }
}

fixCategories();
