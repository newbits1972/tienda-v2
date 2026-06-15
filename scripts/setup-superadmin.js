const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, setDoc, doc, Timestamp } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function setupSuperAdmin() {
    const uid = 'coLI9Lbv7IRgdi30hO9EjnW8i7D3';
    const email = 'datasensecat@gmail.com'; // O el email que prefieras dejar asociado
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log(`Configurando SuperAdmin para UID: ${uid}...`);

    try {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, {
            email: email,
            nombre: 'Admin Principal',
            rol: 'superadmin',
            activo: true,
            tenantId: null,
            updated_at: Timestamp.now()
        }, { merge: true });

        console.log('✅ Documento de SuperAdmin configurado exitosamente.');
    } catch (error) {
        console.error('❌ Error configurando SuperAdmin:', error);
        console.log('\nRecuerda relajar las reglas de Firestore (allow read, write: if true) antes de correr este script.');
    }
}

setupSuperAdmin();
