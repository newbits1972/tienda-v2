'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Branch } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';

interface BranchContextValue {
    branches: Branch[];
    activeBranch: Branch | null;
    setActiveBranchId: (branchId: string | null) => void;
    activeBranchId: string | null;
    hasMultipleBranches: boolean;
    loading: boolean;
}

const BranchContext = createContext<BranchContextValue>({
    branches: [],
    activeBranch: null,
    setActiveBranchId: () => {},
    activeBranchId: null,
    hasMultipleBranches: false,
    loading: true,
});

const STORAGE_KEY = 'datasense_active_branch';

export function BranchProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { tenantId } = useTenant();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Cargar sucursales del tenant
    useEffect(() => {
        if (!tenantId) {
            setBranches([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'branches'),
            where('tenantId', '==', tenantId),
            where('activa', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Branch);
            setBranches(data);
            setLoading(false);

            // Auto-selección inicial:
            // 1. La asignada al usuario (user.branch_id)
            // 2. La casa central
            // 3. La primera disponible
            // 4. La guardada en localStorage
            if (!activeBranchId && data.length > 0) {
                const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
                const userBranch = user?.branch_id;
                const casaCentral = data.find(b => b.es_casa_central);

                const initial = data.find(b => b.id === userBranch)
                    || data.find(b => b.id === stored)
                    || casaCentral
                    || data[0];

                if (initial) {
                    setActiveBranchIdState(initial.id);
                }
            }
        });

        return () => unsubscribe();
    }, [tenantId, user?.branch_id]);

    const setActiveBranchId = (branchId: string | null) => {
        setActiveBranchIdState(branchId);
        if (typeof window !== 'undefined') {
            if (branchId) localStorage.setItem(STORAGE_KEY, branchId);
            else localStorage.removeItem(STORAGE_KEY);
        }
    };

    const activeBranch = branches.find(b => b.id === activeBranchId) || null;

    const value: BranchContextValue = {
        branches,
        activeBranch,
        setActiveBranchId,
        activeBranchId,
        hasMultipleBranches: branches.length > 1,
        loading,
    };

    return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
    return useContext(BranchContext);
}
