'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingCart,
    Shirt,
    Users,
    TrendingUp,
    Settings,
    LogOut,
    Building2,
    BarChart3,
    ChevronLeft,
    RotateCcw,
    Globe,
    Store,
    ArrowLeftRight,
    Tag,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Punto de Venta', href: '/pos', icon: ShoppingCart },
    { name: 'Productos', href: '/productos', icon: Shirt },
    { name: 'Compras', href: '/purchases', icon: TrendingUp },
    { name: 'Transferencias', href: '/transferencias', icon: ArrowLeftRight, module: 'multi_branch' },
    { name: 'Etiquetas', href: '/etiquetas', icon: Tag },
    { name: 'Devoluciones', href: '/returns', icon: RotateCcw },
    { name: 'Proveedores', href: '/suppliers', icon: Building2 },
    { name: 'Clientes', href: '/customers', icon: Users },
    { name: 'Sucursales', href: '/sucursales', icon: Store, module: 'multi_branch' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Reportes', href: '/reports', icon: BarChart3 },
    { name: 'Tienda Online', href: '/catalog-settings', icon: Globe, module: 'ecommerce' },
    { name: 'Configuración', href: '/settings', icon: Settings },
    { name: 'Marketing Social', href: '/marketing/social', icon: Sparkles },
    { name: 'Roles y Permisos', href: '/roles', icon: Settings },
    { name: 'Panel Global', href: '/admin/dashboard', icon: Globe },
];

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
    isMobileOpen: boolean;
    setIsMobileOpen: (value: boolean) => void;
}

export function Sidebar({
    isCollapsed,
    setIsCollapsed,
    isMobileOpen,
    setIsMobileOpen
}: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { config } = useBranding();

    const sidebarClass = cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out lg:static",
        isCollapsed ? "w-20" : "w-64",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    );

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div className={sidebarClass}>
                {/* Logo Section */}
                <div className="flex h-16 items-center justify-between border-b border-border px-6">
                    {!isCollapsed && (
                        <div className="flex items-center gap-2 overflow-hidden">
                            {config?.branding?.logoUrl ? (
                                <img
                                    src={config.branding.logoUrl}
                                    alt={config.nombre}
                                    className="h-8 w-auto object-contain animate-in fade-in duration-300"
                                />
                            ) : (
                                <h1 className="text-xl font-bold text-primary animate-in fade-in duration-300">
                                    {config?.nombre || 'DataSense'}
                                </h1>
                            )}
                        </div>
                    )}
                    {isCollapsed && (
                        <div className="mx-auto text-primary font-bold text-xl">
                            {config?.nombre?.charAt(0) || 'D'}
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden lg:flex h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", isCollapsed && "rotate-180")} />
                    </Button>
                </div>

                {/* Paused Indicator */}
                {user?.isTenantActive === false && user.rol !== 'superadmin' && (
                    <div className={cn(
                        "mx-3 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-center animate-pulse",
                        isCollapsed && "px-0 py-2"
                    )}>
                        {!isCollapsed ? (
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                                <Building2 className="w-3 h-3" />
                                Cuenta Pausada
                            </p>
                        ) : (
                            <Building2 className="w-4 h-4 mx-auto" />
                        )}
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                    {navigation.filter(item => {
                        if (!user) return false;
                        if (user.rol === 'superadmin') return true;

                        // Check Modular Access
                        const modules = config?.modules;
                        if ((item as any).module && modules) {
                            const moduleKey = (item as any).module as keyof typeof modules;
                            if (modules[moduleKey] === false) return false;
                        }

                        // Hide SuperAdmin panel for non-superadmins
                        if (item.href.startsWith('/admin')) return false;

                        if (user.rol === 'admin') return true;

                        // Cashier restrictions
                        const allowedForCashier = ['/dashboard', '/pos', '/productos', '/customers', '/settings', '/delivery', '/waiter'];
                        return allowedForCashier.includes(item.href);
                    }).map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all group',
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                    isCollapsed && "justify-center px-2"
                                )}
                                title={isCollapsed ? item.name : ""}
                                onClick={() => setIsMobileOpen(false)}
                            >
                                <item.icon className={cn("h-5 w-5 flex-shrink-0", !isActive && "group-hover:text-primary")} />
                                {!isCollapsed && (
                                    <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="border-t border-border p-4">
                    <div className={cn("flex items-center gap-3 mb-3", isCollapsed && "justify-center")}>
                        <div className="h-10 w-10 min-w-[40px] rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                            {user?.nombre?.charAt(0) || 'U'}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 truncate animate-in fade-in duration-300">
                                <p className="text-sm font-medium truncate">{user?.nombre || 'Usuario Demo'}</p>
                                <p className="text-xs text-muted-foreground capitalize">{user?.rol || 'Administrador'}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => logout()}
                        className={cn(
                            "flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive w-full transition-colors group",
                            isCollapsed && "justify-center"
                        )}
                        title={isCollapsed ? "Cerrar Sesión" : ""}
                    >
                        <LogOut className="h-4 w-4" />
                        {!isCollapsed && <span className="animate-in fade-in duration-300">Cerrar Sesión</span>}
                    </button>
                </div>
            </div>
        </>
    );
}
