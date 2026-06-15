'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { getStoreConfig } from '@/lib/tenant/configService';
import { StoreConfig } from '@/lib/types';

// Helper to convert hex to HSL components
const hexToHsl = (hex: string): string => {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse r, g, b
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
};

interface BrandingContextType {
    config: StoreConfig | null;
    loading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
    config: null,
    loading: true,
});

export const BrandingProvider = ({ children }: { children: React.ReactNode }) => {
    const { tenantId } = useTenant();
    const [config, setConfig] = useState<StoreConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBranding = async () => {
            setLoading(true);
            const storeConfig = await getStoreConfig(tenantId);
            setConfig(storeConfig);

            if (storeConfig?.branding) {
                applyBranding(storeConfig.branding);
            }
            setLoading(false);
        };

        if (tenantId) {
            loadBranding();
        }
    }, [tenantId]);

    const applyBranding = (branding: NonNullable<StoreConfig['branding']>) => {
        const root = document.documentElement;
        console.log('Applying branding:', branding);

        // Reset theme classes
        root.classList.remove('theme-clean', 'theme-fresh', 'theme-slate');

        // Apply selected theme
        if (branding.themeId) {
            const themeClass = branding.themeId === 'clean-enterprise' ? 'theme-clean' :
                branding.themeId === 'fresh-retail' ? 'theme-fresh' :
                    branding.themeId === 'modern-slate' ? 'theme-slate' : '';

            console.log('Selected theme class:', themeClass);
            if (themeClass) {
                root.classList.add(themeClass);
                // When a theme is active, we should NOT set an inline --primary 
                // unless we want to override the theme's default blue/green/orange.
                // For now, let's remove it to ensure the theme class wins.
                root.style.removeProperty('--primary');
            }
        }

        if (branding.primaryColor) {
            console.log('Setting primary colors:', branding.primaryColor);
            root.style.setProperty('--tenant-primary', branding.primaryColor);

            // ALWAYS set --primary to match primaryColor to ensure consistency
            // especially when the database might have a different primaryColor than the theme's default
            try {
                const hsl = hexToHsl(branding.primaryColor);
                root.style.setProperty('--primary', hsl);
            } catch (e) {
                console.error('Error converting color to HSL:', e);
            }
        } else {
            // Fallback to default gold/yellow if no primaryColor is provided
            root.style.setProperty('--primary', '45 100% 51%');
            root.style.setProperty('--tenant-primary', '#FFBC0D');
        }

        if (branding.secondaryColor) {
            root.style.setProperty('--tenant-secondary', branding.secondaryColor);
        }

        // Automatically handle dark mode for specific themes
        if (branding.themeId === 'clean-enterprise' || branding.themeId === 'fresh-retail' || branding.themeId === 'modern-slate') {
            root.classList.remove('dark');
        }

        if (branding.themeMode) {
            if (branding.themeMode === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    };

    return (
        <BrandingContext.Provider value={{ config, loading }}>
            {children}
        </BrandingContext.Provider>
    );
};

export const useBranding = () => useContext(BrandingContext);
