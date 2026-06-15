'use client';

import { useBranding } from '@/contexts/BrandingContext';
import { StoreModules } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useModuleStatus() {
    const { config, loading } = useBranding();
    const router = useRouter();

    const isModuleActive = (moduleKey: keyof StoreModules): boolean => {
        if (loading) return true; // Assume active while loading to avoid flickers
        if (!config?.modules) return true; // Legacy/Default support
        return !!config.modules[moduleKey];
    };

    const protectRoute = (moduleKey: keyof StoreModules) => {
        useEffect(() => {
            if (!loading && !isModuleActive(moduleKey)) {
                router.replace('/dashboard');
            }
        }, [loading, config, moduleKey, router]);
    };

    return { isModuleActive, protectRoute, loading };
}
