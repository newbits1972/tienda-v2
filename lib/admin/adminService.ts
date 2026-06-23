import { db } from '@/lib/firebase/config';
import { getStoreConfig } from '@/lib/tenant/configService';
import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    updateDoc,
    where,
    limit,
    getDoc,
    setDoc,
    serverTimestamp,
    addDoc,
    deleteDoc
} from 'firebase/firestore';
import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/lib/firebase/config';
import { StoreConfig, Sale, Product } from '@/lib/types';

/**
 * Super-Admin Service for global (cross-tenant) operations.
 * Important: These functions should only be called if the user has 'superadmin' role.
 */

/**
 * Fetches all stores/tenants in the system.
 */
export async function getAllTenants(): Promise<StoreConfig[]> {
    const configsRef = collection(db, 'store_configs');
    const q = query(configsRef, orderBy('created_at', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as StoreConfig));
}

/**
 * Fetches global metrics across all tenants.
 * For a real SaaS, this might involve an aggregation function or a daily_stats collection.
 * For now, we do a cross-tenant summary of the 'store_configs'.
 */
export async function getGlobalStats() {
    const tenants = await getAllTenants();

    const stats = {
        totalTenants: tenants.length,
        activeTenants: tenants.length, // Placeholder for status field
        totalSalesVolume: 0, // Would need global query
        lastActivity: new Date()
    };

    return stats;
}

/**
 * Fetches recent sales from ALL stores (caution: performance on large DB)
 */
export async function getGlobalRecentSales(count: number = 10): Promise<Sale[]> {
    const salesRef = collection(db, 'sales');
    const q = query(salesRef, orderBy('fecha', 'desc'), limit(count));
    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Sale));
}

/**
 * Creates a new store/tenant configuration.
 */
export async function createTenant(tenantId: string, nombre: string): Promise<void> {
    const configRef = doc(db, 'store_configs', tenantId);

    // Check if it already exists
    const snap = await getDoc(configRef);
    if (snap.exists()) {
        throw new Error('El ID de tienda ya existe.');
    }

    const newConfig: Partial<StoreConfig> = {
        nombre,
        razonSocial: '',
        cuit: '',
        direccion: '',
        telefono: '',
        whatsapp: '',
        rubro: 'Indumentaria',
        active: true,
        created_at: serverTimestamp() as any,
        mercadoPago: {
            accessToken: '',
            publicKey: ''
        },
        afip: {
            cuit: '',
            punto_venta: 1
        },
        updated_at: serverTimestamp() as any
    };

    await setDoc(configRef, newConfig);
}

/**
 * Provisions a new admin user for a specific tenant.
 * NOW WITH PASSWORD: Uses a secondary app instance to create user in Auth without logging out current user.
 */
export async function provisionAdmin(email: string, nombre: string, tenantId: string, password?: string): Promise<void> {
    if (!email) throw new Error('El email es requerido para provisionar.');
    if (!tenantId) throw new Error('El ID de tienda es requerido para provisionar.');

    // 1. Check if user already exists (by email) in our 'users' collection
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snap = await getDocs(q);

    if (!snap.empty) {
        throw new Error('Ya existe un usuario con este email en el sistema.');
    }

    let uidToUse = null;

    // 2. If password provided, Create User in Auth using Secondary App
    if (password) {
        const secondaryAppName = 'secondaryAuthApp';
        let secondaryApp;

        try {
            secondaryApp = getApp(secondaryAppName);
        } catch (e) {
            secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        }

        const secondaryAuth = getAuth(secondaryApp);

        try {
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            uidToUse = userCredential.user.uid;

            // Important: Sign out from secondary immediately
            await signOut(secondaryAuth);
        } catch (error: any) {
            // Handle "email-already-in-use" in Auth (even if not in Firestore)
            if (error.code === 'auth/email-already-in-use') {
                throw new Error('El email ya está registrado en Firebase Auth.');
            }
            throw error;
        } finally {
            // Optional: Cleanup if desired, but waiting for async delete might slow down UI
            // try { await deleteApp(secondaryApp); } catch(e) {}
        }
    }

    // 3. Create the User Document in Firestore
    const docId = uidToUse || email.replace(/[^a-zA-Z0-9]/g, '_');

    await setDoc(doc(db, 'users', docId), {
        email,
        nombre,
        rol: 'admin',
        tenantId,
        activo: true,
        created_at: serverTimestamp()
    });

    // 4. If NO password, send invitation email via Firestore Trigger Email extension
    if (!password) {
        try {
            const store = await getStoreConfig(tenantId);
            const storeName = store?.nombre || 'Tu Tienda';
            const inviteLink = `${window.location.origin}/login?mode=register&email=${encodeURIComponent(email)}&nombre=${encodeURIComponent(nombre)}`;

            await addDoc(collection(db, 'mail'), {
                to: email,
                message: {
                    subject: `Invitación de Gestión: ${storeName}`,
                    html: `<h1>Bienvenido a ${storeName}</h1>
<p>Hola <strong>${nombre}</strong>,</p>
<p>Te invitaron a gestionar la tienda <strong>${storeName}</strong> en DataSense Retail.</p>
<p><a href="${inviteLink}" style="padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Aceptar Invitación</a></p>
<p>Si no esperabas este correo, ignoralo.</p>`
                },
                created_at: serverTimestamp()
            });
        } catch (mailError) {
            console.error("Error queueing invitation email:", mailError);
            // We don't throw here to avoid failing the whole user creation
        }
    }
}

/**
 * Deletes a tenant configuration and its associated users.
 * Note: For a real production system, consider a soft-delete or a background task 
 * to clean up all other associated data (products, sales, etc).
 */
export async function deleteTenant(tenantId: string): Promise<void> {
    if (!tenantId) throw new Error('El ID de tienda es requerido para eliminar.');

    // 1. Delete all users associated with this tenant
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('tenantId', '==', tenantId));
    const snap = await getDocs(q);

    // We do this individually for Firestore safety
    const deletePromises = snap.docs.map(userDoc => deleteDoc(userDoc.ref));
    await Promise.all(deletePromises);

    // 2. Delete the store configuration
    const configRef = doc(db, 'store_configs', tenantId);
    await deleteDoc(configRef);
}

/**
 * Updates the activation status of a tenant (Pause/Resume).
 */
export async function updateTenantStatus(tenantId: string, active: boolean): Promise<void> {
    const configRef = doc(db, 'store_configs', tenantId);
    await updateDoc(configRef, {
        active: active,
        updated_at: serverTimestamp()
    });
}
