'use client';

import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Truck,
    Phone,
    Mail,
    ExternalLink,
    Eye,
    ShoppingCart
} from 'lucide-react';
import {
    collection,
    onSnapshot,
    query,
    orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { ProviderDialog } from '@/components/providers/ProviderDialog';
import { PurchaseDialog } from '@/components/providers/PurchaseDialog';
import { ProviderDetailDialog } from '@/components/providers/ProviderDetailDialog';

interface Provider {
    id: string;
    nombre: string;
    cuit?: string;
    telefono: string;
    email: string;
    direccion: string;
    saldo: number;
}

export default function ProvidersPage() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);
    const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'providers'), orderBy('nombre', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const providersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Provider[];
            setProviders(providersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredProviders = providers.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cuit?.includes(searchTerm)
    );

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Truck className="w-8 h-8" />
                        Proveedores
                    </h1>
                    <p className="text-zinc-500">
                        Gestiona tus suministradores, compras y cuentas corrientes.
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button
                        onClick={() => {
                            setSelectedProvider(null);
                            setIsProviderDialogOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex-1 md:flex-none gap-2"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Proveedor
                    </Button>
                    <Button
                        onClick={() => setIsPurchaseDialogOpen(true)}
                        className="bg-muted hover:bg-muted/80 text-primary font-semibold flex-1 md:flex-none gap-2 border border-primary/20"
                    >
                        <ShoppingCart className="w-4 h-4" /> Registrar Compra
                    </Button>
                </div>
            </div>

            {/* Analytics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="overflow-hidden relative group">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
                                    Total Proveedores
                                </p>
                                <p className="text-3xl font-bold text-white">{providers.length}</p>
                            </div>
                            <div className="p-3 bg-gold/10 rounded-xl group-hover:bg-gold/20 transition-colors">
                                <Truck className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-900/20 overflow-hidden relative group">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
                                    Deuda Total
                                </p>
                                <p className="text-3xl font-bold text-red-500 group-hover:scale-105 transition-transform origin-left">
                                    {formatCurrency(Math.abs(providers.reduce((acc, p) => acc + (p.saldo < 0 ? p.saldo : 0), 0)))}
                                </p>
                            </div>
                            <div className="p-3 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors">
                                <ShoppingCart className="w-6 h-6 text-red-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden">
                    <CardContent className="p-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <Input
                                placeholder="Buscar por nombre o CUIT..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Providers Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Proveedor</th>
                                    <th className="px-6 py-4 font-semibold">Contacto</th>
                                    <th className="px-6 py-4 font-semibold text-right">Saldo Actual</th>
                                    <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                                            Cargando proveedores...
                                        </td>
                                    </tr>
                                ) : filteredProviders.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                                            No se encontraron proveedores.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProviders.map(provider => (
                                        <tr key={provider.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-white">{provider.nombre}</div>
                                                <div className="text-xs text-zinc-500">{provider.cuit || 'Sin CUIT'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 text-sm">
                                                    <span className="flex items-center gap-2 text-zinc-300">
                                                        <Phone className="w-3 h-3 text-primary/60" /> {provider.telefono}
                                                    </span>
                                                    <span className="flex items-center gap-2 text-zinc-500 text-xs italic">
                                                        <Mail className="w-3 h-3" /> {provider.email}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={cn(
                                                    "font-bold text-lg",
                                                    provider.saldo < 0 ? "text-red-500" : "text-green-500"
                                                )}>
                                                    {formatCurrency(provider.saldo)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setSelectedProvider(provider);
                                                            setIsDetailOpen(true);
                                                        }}
                                                        className="hover:bg-gold/10 hover:text-gold"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setSelectedProvider(provider);
                                                            setIsProviderDialogOpen(true);
                                                        }}
                                                        className="hover:bg-zinc-800"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Provider Dialog */}
            <ProviderDialog
                isOpen={isProviderDialogOpen}
                onClose={() => {
                    setIsProviderDialogOpen(false);
                    setSelectedProvider(null);
                }}
                provider={selectedProvider}
            />

            {/* Placeholder for other Dialogs */}
            {isPurchaseDialogOpen && (
                <PurchaseDialog
                    isOpen={isPurchaseDialogOpen}
                    onClose={() => setIsPurchaseDialogOpen(false)}
                />
            )}
            {/* 
            {selectedProvider && isDetailOpen && (
                <ProviderDetailDialog 
                    isOpen={isDetailOpen} 
                    onClose={() => setIsDetailOpen(false)} 
                    provider={selectedProvider}
                />
            )}
            */}
        </div>
    );
}
