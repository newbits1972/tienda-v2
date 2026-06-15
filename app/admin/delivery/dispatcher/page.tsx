'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useTenant } from '@/hooks/useTenant';
import { Order, DeliveryDriver, Product, CartItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Clock, Bike, CheckCircle2, Navigation, MessageCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function DispatcherPage() {
    const { tenantId } = useTenant();
    const [orders, setOrders] = useState<Order[]>([]);
    const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
    const [selectedDrivers, setSelectedDrivers] = useState<{ [orderId: string]: string }>({});

    // Listen for Active Delivery Orders (Ready or Delivering)
    useEffect(() => {
        if (!tenantId) return;

        // Query: Type = delivery AND (status = ready OR status = delivering)
        // Note: Firestore logic might need separate queries or "in" clause for status if index exists.
        // For simplicity in client-side filtering if volume is low, or composite index.
        const q = query(
            collection(db, 'orders'),
            where('tenantId', '==', tenantId),
            where('type', '==', 'delivery'),
            where('status', 'in', ['pending_kitchen', 'cooking', 'ready', 'delivering']),
            orderBy('fecha', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Order[];
            setOrders(data);
        });

        return () => unsubscribe();
    }, [tenantId]);

    // Listen for Drivers
    useEffect(() => {
        if (!tenantId) return;
        const q = query(collection(db, 'delivery_drivers'), where('tenantId', '==', tenantId), where('activo', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as DeliveryDriver[];
            setDrivers(data);
        });
        return () => unsubscribe();
    }, [tenantId]);

    const handleAssignDriver = async (orderId: string, driverId: string) => {
        const driver = drivers.find(d => d.id === driverId);
        if (!driver) return;

        try {
            await updateDoc(doc(db, 'orders', orderId), {
                repartidor_id: driverId,
                repartidor_nombre: driver.nombre,
                status: 'delivering',
                updated_at: Timestamp.now()
            });
            toast.success(`Pedido asignado a ${driver.nombre}`);

            // Auto open WhatsApp with Driver? (Optional)
        } catch (error) {
            console.error(error);
            toast.error('Error al asignar repartidor');
        }
    };

    const handleOpenWhatsAppClient = (order: Order) => {
        if (!order.cliente_telefono) return toast.error('Cliente sin teléfono');
        const driverName = order.repartidor_nombre || 'nuestro repartidor';
        const msg = `¡Hola ${order.cliente_nombre}! 🛵 Tu pedido salió en camino con ${driverName}. Total a pagar: ${formatCurrency(order.total)}. ¡Gracias por elegirnos!`;
        window.open(`https://wa.me/${order.cliente_telefono}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleOpenWhatsAppDriver = (order: Order) => {
        if (!order.repartidor_id) return;
        const driver = drivers.find(d => d.id === order.repartidor_id);
        if (!driver) return toast.error('Repartidor no encontrado');

        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.direccion_entrega || '')}`;
        const items = order.items.map(i => `${i.cantidad}x ${i.producto.nombre}`).join(', ');
        const msg = `🛵 *NUEVO VIAJE*\n\n📍 *Destino:* ${order.direccion_entrega}\n👤 *Cliente:* ${order.cliente_nombre}\n💰 *Cobrar:* ${formatCurrency(order.total)}\n📦 *Pedido:* ${items}\n\n🗺️ *Mapa:* ${mapsLink}`;

        window.open(`https://wa.me/${driver.telefono}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleMarkDelivered = async (orderId: string) => {
        if (!confirm('¿Confirmar entrega y cierre de pedido?')) return;
        try {
            await updateDoc(doc(db, 'orders', orderId), {
                status: 'completed',
                pagado: true,
                updated_at: Timestamp.now()
            });
            toast.success('Pedido entregado');
        } catch (error) {
            toast.error('Error al cerrar pedido');
        }
    };

    // Columns
    const pendingOrders = orders.filter(o => ['pending_kitchen', 'cooking'].includes(o.status));
    const readyOrders = orders.filter(o => o.status === 'ready');
    const deliveringOrders = orders.filter(o => o.status === 'delivering');

    return (
        <div className="p-4 md:p-6 lg:h-[calc(100vh-64px)] lg:overflow-hidden flex flex-col bg-background text-foreground">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gold flex items-center gap-2 tracking-tighter">
                        <Navigation className="w-8 h-8" />
                        DESPACHO
                    </h1>
                    <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">Torre de Control de Delivery</p>
                </div>
                <div className="flex gap-4">
                    <Card className="bg-card border-border py-2 px-4">
                        <span className="text-xs text-muted-foreground uppercase font-bold block">Repartidores Activos</span>
                        <span className="text-2xl font-black text-foreground">{drivers.length}</span>
                    </Card>
                    <Card className="bg-card border-border py-2 px-4">
                        <span className="text-xs text-muted-foreground uppercase font-bold block">En Viaje</span>
                        <span className="text-2xl font-black text-blue-500">{deliveringOrders.length}</span>
                    </Card>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto lg:overflow-hidden min-h-0">
                {/* COL 1: EN PREPARACIÓN (Solo lectura) */}
                <div className="bg-muted/30 rounded-2xl border border-border flex flex-col min-h-[400px] lg:min-h-0">
                    <div className="p-4 border-b border-border bg-muted/50 rounded-t-2xl">
                        <h2 className="font-black uppercase text-muted-foreground tracking-widest text-sm flex items-center gap-2">
                            <Clock className="w-4 h-4" /> En Preparación ({pendingOrders.length})
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {pendingOrders.map(order => (
                            <Card key={order.id} className="bg-card border-border opacity-60 hover:opacity-100 transition-opacity">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="border-border text-muted-foreground">
                                            #{order.id.slice(-4)}
                                        </Badge>
                                        <span className="text-xs font-bold text-muted-foreground">
                                            {order.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-foreground mb-1">{order.cliente_nombre}</h3>
                                    <p className="text-xs text-muted-foreground mb-2 truncate">{order.direccion_entrega}</p>
                                    <div className="text-xs text-gold">En preparación...</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* COL 2: LISTOS PARA DESPACHAR (Acción Principal) */}
                <div className="bg-muted/50 rounded-2xl border border-gold/20 flex flex-col shadow-2xl shadow-black/50 min-h-[400px] lg:min-h-0">
                    <div className="p-4 border-b border-gold/10 bg-gold/5 rounded-t-2xl">
                        <h2 className="font-black uppercase text-gold tracking-widest text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Listos para Despachar ({readyOrders.length})
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {readyOrders.map(order => (
                            <Card key={order.id} className="bg-card border-gold/30 shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-gold" />
                                <CardContent className="p-4 pl-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-black text-lg text-foreground">{order.cliente_nombre}</h3>
                                            <p className="text-sm text-muted-foreground font-medium">{order.direccion_entrega}</p>
                                        </div>
                                        <Badge className="bg-gold text-black hover:bg-gold/90 font-bold">
                                            {formatCurrency(order.total)}
                                        </Badge>
                                    </div>

                                    <div className="bg-muted/50 p-2 rounded-lg mb-4 text-xs text-muted-foreground">
                                        {order.items.map(i => `${i.cantidad} ${i.producto.nombre}`).join(', ')}
                                    </div>

                                    <div className="space-y-2">
                                        <Select
                                            value={selectedDrivers[order.id] || ""}
                                            onValueChange={(val) => setSelectedDrivers({ ...selectedDrivers, [order.id]: val })}
                                        >
                                            <SelectTrigger className="bg-muted border-border text-foreground font-bold h-10">
                                                <SelectValue placeholder="Seleccionar Repartidor..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover border-border text-popover-foreground">
                                                {drivers.map(d => (
                                                    <SelectItem key={d.id} value={d.id}>
                                                        {d.nombre} ({d.vehiculo})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Button
                                            className="w-full h-11 bg-gold text-black hover:bg-gold/90 font-black uppercase tracking-wider shadow-lg shadow-gold/20"
                                            disabled={!selectedDrivers[order.id]}
                                            onClick={() => {
                                                if (selectedDrivers[order.id]) {
                                                    handleAssignDriver(order.id, selectedDrivers[order.id]);
                                                    setSelectedDrivers({ ...selectedDrivers, [order.id]: "" });
                                                }
                                            }}
                                        >
                                            <Bike className="w-4 h-4 mr-2" />
                                            DESPACHAR PEDIDO
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {readyOrders.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50">
                                <CheckCircle2 className="w-12 h-12" />
                                <p className="font-bold uppercase text-xs">Todo despachado</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* COL 3: EN VIAJE (Seguimiento) */}
                <div className="bg-muted/30 rounded-2xl border border-blue-500/20 flex flex-col min-h-[400px] lg:min-h-0">
                    <div className="p-4 border-b border-blue-500/10 bg-blue-500/5 rounded-t-2xl">
                        <h2 className="font-black uppercase text-blue-400 tracking-widest text-sm flex items-center gap-2">
                            <Bike className="w-4 h-4" /> En Viaje ({deliveringOrders.length})
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {deliveringOrders.map(order => (
                            <Card key={order.id} className="bg-card border-border hover:border-blue-500/30 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="bg-blue-900/20 text-blue-400 hover:bg-blue-900/30">
                                                {order.repartidor_nombre}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">hace {Math.floor((Date.now() - order.updated_at.toMillis()) / 60000)} min</span>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-foreground text-sm mb-1">{order.cliente_nombre}</h3>
                                    <p className="text-xs text-muted-foreground mb-3 truncate">{order.direccion_entrega}</p>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-[10px] font-bold uppercase border-border text-muted-foreground hover:text-green-500 hover:bg-green-500/5 hover:border-green-500/20"
                                            onClick={() => handleOpenWhatsAppClient(order)}
                                        >
                                            <MessageCircle className="w-3 h-3 mr-1" /> Avisar Cliente
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-[10px] font-bold uppercase border-border text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5 hover:border-blue-500/20"
                                            onClick={() => handleOpenWhatsAppDriver(order)}
                                        >
                                            <Navigation className="w-3 h-3 mr-1" /> Mapa Chofer
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="gold"
                                            className="col-span-2 h-9 font-bold"
                                            onClick={() => handleMarkDelivered(order.id)}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                            Confirmar Entrega
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

