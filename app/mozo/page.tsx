'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Table, TableStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Armchair, Plus, Settings, Users } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { TableOrderDialog } from '@/components/mozo/TableOrderDialog';

export default function MozoPage() {
    const { tenantId } = useTenant();
    const { user } = useAuth();
    const router = useRouter();
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

    useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(db, 'tables'),
            where('tenantId', '==', tenantId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tablesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Table[];

            // Sort by table number
            tablesData.sort((a, b) => a.numero - b.numero);
            setTables(tablesData);
            setLoading(false);

            // Sync selected table if it changes in firestore while dialog is open
            if (selectedTable) {
                const updated = tablesData.find(t => t.id === selectedTable.id);
                if (updated) setSelectedTable(updated);
            }
        });

        return () => unsubscribe();
    }, [tenantId, selectedTable?.id]);

    const handleTableClick = (table: Table) => {
        if (table.estado === 'pendiente_cobro') {
            toast.info(`Mesa ${table.numero} pendiente de cobro. Diríjase al POS.`);
            return;
        }

        setSelectedTable(table);
        setIsOrderDialogOpen(true);
    };

    const getStatusColor = (status: TableStatus): string => {
        switch (status) {
            case 'libre': return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500';
            case 'ocupada': return 'bg-amber-500/20 border-amber-500/40 text-amber-500';
            case 'pendiente_cobro': return 'bg-gold/20 border-gold/40 text-gold';
        }
    };

    const getStatusLabel = (status: TableStatus): string => {
        switch (status) {
            case 'libre': return 'Libre';
            case 'ocupada': return 'Ocupada';
            case 'pendiente_cobro': return 'Por Cobrar';
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Cargando salón...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gold flex items-center gap-3">
                        <Armchair className="w-8 h-8" />
                        Gestión de Salón
                    </h1>
                    <p className="text-zinc-500">Plano de mesas y pedidos en curso</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/mozo/config')}
                        className="gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        Configurar Mesas
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-emerald-500/10 border-emerald-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-emerald-500 uppercase font-bold">Libres</p>
                                <p className="text-3xl font-bold text-emerald-500">
                                    {tables.filter(t => t.estado === 'libre').length}
                                </p>
                            </div>
                            <Armchair className="w-10 h-10 text-emerald-500/40" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-amber-500 uppercase font-bold">Ocupadas</p>
                                <p className="text-3xl font-bold text-amber-500">
                                    {tables.filter(t => t.estado === 'ocupada').length}
                                </p>
                            </div>
                            <Users className="w-10 h-10 text-amber-500/40" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gold/10 border-gold/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gold uppercase font-bold">Por Cobrar</p>
                                <p className="text-3xl font-bold text-gold">
                                    {tables.filter(t => t.estado === 'pendiente_cobro').length}
                                </p>
                            </div>
                            <Plus className="w-10 h-10 text-gold/40" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-zinc-500 uppercase font-bold">Total Mesas</p>
                                <p className="text-3xl font-bold text-white">
                                    {tables.length}
                                </p>
                            </div>
                            <Armchair className="w-10 h-10 text-zinc-700" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Floor Plan - Table Grid */}
            {tables.length === 0 ? (
                <Card className="border-dashed border-2 border-zinc-800">
                    <CardContent className="py-20 text-center">
                        <Armchair className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">No hay mesas configuradas</h3>
                        <p className="text-zinc-500 mb-6">Crea la distribución de tu salón para comenzar</p>
                        <Button
                            onClick={() => router.push('/mozo/config')}
                            className="bg-gold hover:bg-yellow-500 text-black font-bold"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Configurar Mesas
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {tables.map((table) => (
                        <Card
                            key={table.id}
                            className={`cursor-pointer transition-all hover:scale-105 ${getStatusColor(table.estado)} border-2`}
                            onClick={() => handleTableClick(table)}
                        >
                            <CardContent className="p-6 text-center space-y-2">
                                <Armchair className="w-12 h-12 mx-auto" />
                                <div>
                                    <p className="text-2xl font-black">Mesa {table.numero}</p>
                                    <Badge variant="outline" className="text-[10px] border-current mt-1">
                                        {getStatusLabel(table.estado)}
                                    </Badge>
                                </div>
                                {table.cliente_nombre && (
                                    <p className="text-xs truncate opacity-80">{table.cliente_nombre}</p>
                                )}
                                <p className="text-[10px] opacity-60">{table.capacidad} personas</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <TableOrderDialog
                isOpen={isOrderDialogOpen}
                onClose={() => setIsOrderDialogOpen(false)}
                table={selectedTable}
                tenantId={tenantId!}
            />
        </div>
    );
}
