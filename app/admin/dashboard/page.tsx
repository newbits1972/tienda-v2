'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    ShoppingCart,
    TrendingUp,
    AlertTriangle,
    Store,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';
import { getGlobalStats, getAllTenants, getGlobalRecentSales } from '@/lib/admin/adminService';
import { StoreConfig, Sale } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toDate } from '@/lib/utils';
import { TenantDialog } from '@/components/admin/TenantDialog';
import { StoreManagementDialog } from '@/components/admin/StoreManagementDialog';
import { Plus, Settings } from 'lucide-react';

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [tenants, setTenants] = useState<StoreConfig[]>([]);
    const [recentSales, setRecentSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isTenantDialogOpen, setIsTenantDialogOpen] = useState(false);
    const [isManagementOpen, setIsManagementOpen] = useState(false);
    const [selectedStore, setSelectedStore] = useState<StoreConfig | null>(null);

    const loadGlobalData = async () => {
        try {
            const [globalStats, allTenants, globalSales] = await Promise.all([
                getGlobalStats(),
                getAllTenants(),
                getGlobalRecentSales(5)
            ]);

            setStats(globalStats);
            setTenants(allTenants);
            setRecentSales(globalSales);
        } catch (error) {
            console.error('Error loading global data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && (!user || user.rol !== 'superadmin')) {
            redirect('/dashboard');
        }
    }, [user, authLoading]);

    useEffect(() => {
        if (user?.rol === 'superadmin') {
            loadGlobalData();
        }
    }, [user]);

    const filteredTenants = tenants.filter(t =>
        t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading || loading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando Panel Global...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gold flex items-center gap-2">
                        Panel de Super-Administrador
                    </h1>
                    <p className="text-muted-foreground">
                        Visión global de la plataforma SaaS y gestión de inquilinos.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setIsTenantDialogOpen(true)}
                        className="bg-gold text-black hover:bg-gold/90 font-bold gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Tienda
                    </Button>
                    <Button variant="outline" size="sm" className="border-gold/20 text-gold hover:bg-gold/10 hidden md:flex">
                        Exportar Reporte Global
                    </Button>
                </div>
            </div>

            {/* Global Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Tiendas</CardTitle>
                        <Store className="h-4 w-4 text-gold" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
                        <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                            <ArrowUpRight className="h-3 w-3" />
                            +2 este mes
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tiendas Activas</CardTitle>
                        <Users className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">{stats?.activeTenants || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            100% de operatividad
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ventas Totales (Plataforma)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-gold" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${recentSales.reduce((acc, sale) => acc + sale.total, 0).toLocaleString()}</div>
                        <Badge variant="outline" className="mt-1 text-[10px] border-gold/20 text-gold font-normal">
                            Últimas 5 transacciones
                        </Badge>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Sistema</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-500">0</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ninguna incidencia reportada
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tenants List */}
                <Card className="lg:col-span-2 bg-card border-border">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Gestión de Tiendas</CardTitle>
                                <CardDescription>Listado y control de inquilinos activos.</CardDescription>
                            </div>
                            <div className="relative w-48">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar tienda..."
                                    className="pl-8 bg-background border-border"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {filteredTenants.map((tenant) => (
                                <div key={tenant.id} className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-gold/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold">
                                            {tenant.nombre.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-foreground">{tenant.nombre}</h3>
                                            <p className="text-xs text-muted-foreground font-mono">{tenant.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Estado</p>
                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                Activa
                                            </Badge>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground hover:text-gold"
                                            onClick={() => {
                                                setSelectedStore(tenant);
                                                setIsManagementOpen(true);
                                            }}
                                        >
                                            Gestionar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Global Activity */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-gold" />
                            Actividad Global
                        </CardTitle>
                        <CardDescription>Ultimas ventas en toda la red.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {recentSales.map((sale) => (
                                <div key={sale.id} className="relative pl-6 border-l-2 border-border pb-1">
                                    <div className="absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-gold" />
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-xs font-mono text-muted-foreground">
                                            {sale.tenantId}
                                        </p>
                                        <span className="text-xs text-muted-foreground/60">
                                            {format(toDate(sale.fecha), 'HH:mm', { locale: es })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-medium text-foreground">Venta #${sale.id.slice(-4)}</p>
                                        <p className="text-sm font-bold text-gold">${sale.total.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full mt-6 text-muted-foreground hover:text-gold text-xs">
                            Ver historial completo
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <TenantDialog
                isOpen={isTenantDialogOpen}
                onClose={() => setIsTenantDialogOpen(false)}
                onSuccess={loadGlobalData}
            />

            <StoreManagementDialog
                isOpen={isManagementOpen}
                onClose={() => setIsManagementOpen(false)}
                store={selectedStore}
            />
        </div>
    );
}
