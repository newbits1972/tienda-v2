'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    User,
    signOut,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { User as AppUser } from '@/lib/types';

interface AuthContextType {
    user: (AppUser & { isTenantActive?: boolean }) | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch additional user data from Firestore if needed
                // For now, we'll map the basic info or check if it exists in 'users' collection
                const userRef = doc(db, 'users', firebaseUser.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data() as AppUser;
                    let isTenantActive = true;

                    // If not superadmin, check if tenant is active
                    if (userData.rol !== 'superadmin' && userData.tenantId) {
                        try {
                            const storeRef = doc(db, 'store_configs', userData.tenantId);
                            const storeSnap = await getDoc(storeRef);
                            if (storeSnap.exists()) {
                                const storeData = storeSnap.data();
                                isTenantActive = storeData.active !== false;
                            }
                        } catch (e) {
                            console.error("Error checking store status", e);
                        }
                    }

                    const { id, ...otherData } = userData as any;
                    setUser({
                        id: firebaseUser.uid,
                        ...otherData,
                        isTenantActive
                    } as any);
                } else {
                    // Fallback: Check if there is an "invite" document with the email as key or property
                    // This handles cases where provisionAdmin created a doc but Auth link didn't happen perfectly
                    let roleStr = 'cajero';
                    let tenantId = null;

                    if (firebaseUser.email) {
                        try {
                            const usersRef = collection(db, 'users');
                            const q = query(usersRef, where('email', '==', firebaseUser.email));
                            const inviteSnap = await getDocs(q);

                            if (!inviteSnap.empty) {
                                const inviteData = inviteSnap.docs[0].data();
                                roleStr = inviteData.rol || 'cajero';
                                tenantId = inviteData.tenantId || null;
                            }
                        } catch (e) {
                            console.error("Error checking invites", e);
                        }
                    }

                    setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        nombre: firebaseUser.displayName || 'Usuario',
                        rol: roleStr,
                        tenantId: tenantId,
                        activo: true,
                        created_at: firebaseUser.metadata.creationTime ? firebaseUser.metadata.creationTime : new Date().toISOString()
                    } as any);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        setLoading(true);
        await signOut(auth);
        setUser(null);
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
