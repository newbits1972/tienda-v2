const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Ubicación del archivo de cuenta de servicio
const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: No se encontró el archivo firebase-service-account.json.');
    process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Leer el correo electrónico desde los argumentos
const emailArg = process.argv[2];

if (!emailArg) {
    console.error('❌ Error: Debes proporcionar un correo electrónico.');
    console.log('Uso: node scripts/make-admin.js usuario@ejemplo.com');
    process.exit(1);
}

const targetEmail = emailArg.trim().toLowerCase();

async function run() {
    try {
        console.log(`🚀 Conectando a Firebase para asignar rol SuperAdmin al correo: ${targetEmail}...`);
        
        // Inicializar SDK
        admin.initializeApp({
            credential: admin.cert(sa)
        });
        
        const db = getFirestore();
        const auth = admin.auth();
        
        let uid = null;
        let displayName = 'Administrador';
        
        // 1. Intentar buscar el usuario en Auth
        try {
            const userRecord = await auth.getUserByEmail(targetEmail);
            uid = userRecord.uid;
            displayName = userRecord.displayName || displayName;
            console.log(`✅ Usuario encontrado en Auth. UID: ${uid}`);
        } catch (authError) {
            if (authError.code === 'auth/user-not-found') {
                console.log(`⚠️ Advertencia: El correo "${targetEmail}" no está registrado en la autenticación de Firebase.`);
                console.log('Se creará el documento en Firestore de todas formas como invitación previa.');
                // Generar un ID ficticio o usar el correo como ID para la invitación si es necesario,
                // pero la colección de usuarios usualmente requiere el UID real para que coincida.
                // Como alternativa, crearemos el documento cuando el usuario se registre.
                // Sin embargo, para evitar que entre como cajero directo, podemos buscar en Firestore
                // un documento existente o simplemente informar al usuario.
                console.log('\nRecomendación: Regístrate primero en la aplicación y luego vuelve a correr este comando.');
                process.exit(1);
            } else {
                throw authError;
            }
        }
        
        // 2. Crear o actualizar el documento del usuario en Firestore
        const userRef = db.collection('users').doc(uid);
        await userRef.set({
            email: targetEmail,
            nombre: displayName,
            rol: 'superadmin',
            activo: true,
            tenantId: 'default_store', // Asignar a la tienda semilla de retail
            updated_at: FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log(`\n🎉 ¡Operación exitosa! El usuario con correo "${targetEmail}" ahora es SuperAdmin en la tienda "default_store".`);
        console.log('Inicia sesión nuevamente en la web para que se apliquen los cambios de rol.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ocurrió un error:', error.message || error);
        process.exit(1);
    }
}

run();
