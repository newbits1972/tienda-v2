'use client';

import { useAuth } from '@/contexts/AuthContext';

export function useTenant() {
    const { user } = useAuth();

    // In a real SaaS, every user MUST have a tenantId.
    // For the transition, we'll fallback to a default if not found.
    const tenantId = user?.tenantId || 'default_store';

    return {
        tenantId,
        isLoaded: !!user,
        storeName: user?.storeName || 'Mi Tienda'
    };
}
