'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { PausedOverlay } from './PausedOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ContentLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const isLoginPage = pathname === '/login';
    const isPublicPage = pathname?.startsWith('/catalogo') || false;

    useEffect(() => {
        if (!loading && !user && !isLoginPage && !isPublicPage) {
            router.push('/login');
        }
    }, [user, loading, isLoginPage, isPublicPage, router]);

    if (loading && !isLoginPage) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (isLoginPage || isPublicPage) {
        return <main className="flex-1 overflow-y-auto bg-background">{children}</main>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden flex h-16 items-center border-b px-4 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileOpen(true)}
                        className="text-muted-foreground"
                    >
                        <Menu className="h-6 w-6" />
                    </Button>
                    <h1 className="ml-4 text-xl font-bold text-primary">DataSense</h1>
                </header>

                <main className="flex-1 overflow-y-auto p-0 relative">
                    {user && user.isTenantActive === false && <PausedOverlay />}
                    {children}
                </main>
            </div>
        </div>
    );
}
