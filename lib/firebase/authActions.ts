import {
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc, Timestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

/**
 * Inicia sesión con email y contraseña
 */
export const login = async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
};

/**
 * Cierra la sesión actual
 */
export const logout = async () => {
    return signOut(auth);
};

/**
 * Función especial para crear el usuario administrador inicial
 * Solo debe usarse durante el setup.
 */
export const createInitialAdmin = async (email: string, pass: string, nombre: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    // Actualizar perfil básico en Firebase Auth
    await updateProfile(user, { displayName: nombre });

    // 1. Check if there is a pending "invite" or provisioned user doc with this email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    let roleToAssign = 'admin'; // Default fallback, but maybe we should be safer?
    let tenantIdToAssign = null;
    let inviteDocId = null;

    if (!querySnapshot.empty) {
        // Found a provisioned doc!
        const inviteDoc = querySnapshot.docs[0];
        const inviteData = inviteDoc.data();

        console.log("Found provisioned user:", inviteData);

        if (inviteData.tenantId) {
            roleToAssign = inviteData.rol || 'admin';
            tenantIdToAssign = inviteData.tenantId;
            inviteDocId = inviteDoc.id;
        }
    }

    // 2. Create the REAL user document with the UID
    const newUserData: any = {
        nombre,
        email,
        rol: roleToAssign,
        activo: true,
        created_at: Timestamp.now(),
    };

    if (tenantIdToAssign) {
        newUserData.tenantId = tenantIdToAssign;
    }

    await setDoc(doc(db, 'users', user.uid), newUserData);

    // 3. Delete the old "invite" doc if it existed and had a different ID than the UID
    if (inviteDocId && inviteDocId !== user.uid) {
        await deleteDoc(doc(db, 'users', inviteDocId));
    }

    return user;
};

