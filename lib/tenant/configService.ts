import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { StoreConfig } from '@/lib/types';

/**
 * Gets the configuration for a specific store/tenant.
 * Returns null if the store configuration is not found.
 */
export async function getStoreConfig(tenantId: string): Promise<StoreConfig | null> {
    try {
        const docRef = doc(db, 'store_configs', tenantId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as StoreConfig;
        }

        return null;
    } catch (error) {
        console.error(`Error fetching store config for ${tenantId}:`, error);
        return null;
    }
}

/**
 * Gets the Mercado Pago access token for a tenant.
 * Falls back to environment variable if not configured in Firestore.
 */
export async function getMPAccessToken(tenantId: string): Promise<string> {
    const config = await getStoreConfig(tenantId);

    if (config?.mercadoPago?.accessToken) {
        return config.mercadoPago.accessToken;
    }

    // Fallback to environment variable for the main/default store
    return process.env.MP_ACCESS_TOKEN || '';
}

/**
 * Gets the Mercado Pago public key for a tenant.
 * Falls back to environment variable if not configured in Firestore.
 */
export async function getMPPublicKey(tenantId: string): Promise<string> {
    const config = await getStoreConfig(tenantId);

    if (config?.mercadoPago?.publicKey) {
        return config.mercadoPago.publicKey;
    }

    // Fallback to environment variable
    return process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '';
}
