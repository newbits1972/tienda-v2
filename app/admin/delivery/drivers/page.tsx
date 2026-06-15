'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useTenant } from '@/hooks/useTenant';
import { DeliveryDriver } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DriversDialog } from '@/components/delivery/DriversDialog';
import { Truck, Plus, Search, Edit, Trash2, Phone, User, Bike, Car } from 'lucide-react';

export default function DriversPage() {
    const { tenantId } = useTenant();
    const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<DeliveryDriver | null>(null);

    useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(db, 'delivery_drivers'),
            where('tenantId', '==', tenantId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as DeliveryDriver[];
            setDrivers(data);
        });

        return () => unsubscribe();
    }, [tenantId]);

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este repartidor?')) {
            await deleteDoc(doc(db, 'delivery_drivers', id));
        }
    };

    const filteredDrivers = drivers.filter(d =>
        d.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getVehicleIcon = (type: string) => {
        switch (type) {
            case 'moto': return <Bike className="w-4 h-4" />;
            case 'auto': return <Car className="w-4 h-4" />;
            case 'bicicleta': return <Bike className="w-4 h-4" />;
            default: return <Truck className="w-4 h-4" />;
        }
    };

    return (
        <div className="p-6 space-y-6 min-h-screen bg-background text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
                        <Truck className="w-8 h-8" />
                        Flota de Repartidores
                    </h1>
                    <p className="text-muted-foreground">Administra tu equipo de delivery y su disponibilidad.</p>
                </div>
                <Button variant="gold" onClick={() => { setSelectedDriver(null); setIsDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Repartidor
                </Button>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar repartidor..."
                        className="pl-9 bg-muted border-border"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDrivers.map(driver => (
                    <Card key={driver.id} className="bg-card border-border hover:border-accent transition-colors">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${driver.activo ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{driver.nombre}</h3>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase font-bold">
                                            {getVehicleIcon(driver.vehiculo)}
                                            {driver.vehiculo}
                                            {driver.patente && <span className="text-muted-foreground/60">• {driver.patente}</span>}
                                        </div>
                                    </div>
                                </div>
                                <Badge variant={driver.activo ? 'secondary' : 'outline'} className={driver.activo ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'text-muted-foreground'}>
                                    {driver.activo ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded-lg border border-border">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-mono text-foreground">{driver.telefono}</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-muted-foreground hover:text-gold"
                                    onClick={() => { setSelectedDriver(driver); setIsDialogOpen(true); }}
                                >
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-muted-foreground hover:text-red-500"
                                    onClick={() => handleDelete(driver.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredDrivers.length === 0 && (
                    <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800">
                        <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron repartidores</p>
                    </div>
                )}
            </div>

            <DriversDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                driver={selectedDriver}
            />
        </div>
    );
}
