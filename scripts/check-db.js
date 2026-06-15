const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function checkTenant(tenantId) {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log(`Checking tenant: ${tenantId}`);

    const configSnap = await getDoc(doc(db, 'store_configs', tenantId));
    if (configSnap.exists()) {
        console.log('✅ Config found:', configSnap.data().nombre);
    } else {
        console.log('❌ Config NOT found in store_configs');
    }

    const q = query(collection(db, 'products'), where('tenantId', '==', tenantId));
    const prodSnap = await getDocs(q);
    console.log(`📦 Products found for this tenant: ${prodSnap.size}`);

    if (prodSnap.size === 0) {
        const q2 = query(collection(db, 'products'));
        const allSnap = await getDocs(q2);
        console.log(`⚠️ Total products in database (any tenant): ${allSnap.size}`);
        if (allSnap.size > 0) {
            console.log('Primeros 3 productos tenantIds:', allSnap.docs.slice(0, 3).map(d => d.data().tenantId));
        }
    }
}

// Read tenantId from args or default
const tid = process.argv[2] || 'default_store';
checkTenant(tid).catch(console.error);
