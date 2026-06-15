'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { Order, OrderStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bike, MapPin, Phone, CheckCircle2, Navigation } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useModuleStatus } from '@/hooks/useModuleStatus';

export default function DeliveryPage() {
    const { user } = useAuth();
    const { tenantId } = useTenant();
    const { protectRoute } = useModuleStatus();

    protectRoute('delivery');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(db, 'orders'),
            where('tenantId', '==', tenantId),
            where('status', 'in', ['ready', 'delivering']),
            where('type', '==', 'delivery'),
            orderBy('fecha', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Order[];
            setOrders(ordersData);
            setLoading(false);
        }, (error) => {
            console.error("Delivery listener error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                status: newStatus,
                updated_at: Timestamp.now()
            });
            toast.success(`Pedido ${newStatus}`);
        } catch (error) {
            console.error("Error updating delivery:", error);
            toast.error("Error al actualizar despacho");
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando Despacho...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gold flex items-center gap-3">
                        <Bike className="w-8 h-8" />
                        Reparto y Logistics
                    </h1>
                    <p className="text-muted-foreground">Gestión de entregas y repartidores.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.map((order) => (
                    <Card key={order.id} className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <Badge variant={order.status === 'ready' ? 'gold' : 'outline'} className={order.status === 'delivering' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}>
                                    {order.status === 'ready' ? 'LISTO PARA SALIR' : 'EN CAMINO'}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-mono">#{order.id.slice(-4)}</span>
                            </div>
                            <CardTitle className="text-xl mt-2">{order.cliente_nombre}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2 text-zinc-300">
                                    <MapPin className="w-4 h-4 mt-0.5 text-gold" />
                                    <span>{order.direccion_entrega || 'Sin dirección registrada'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span>{order.cliente_telefono || 'Sin teléfono'}</span>
                                </div>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-3">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Detalle de Productos</h4>
                                <div className="space-y-1">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                                            <span>{item.cantidad}x {item.producto.nombre}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col gap-2">
                                {order.status === 'ready' ? (
                                    <Button
                                        className="w-full bg-gold text-black font-bold hover:bg-gold/90"
                                        onClick={() => updateStatus(order.id, 'delivering')}
                                    >
                                        <Navigation className="w-4 h-4 mr-2" />
                                        Despachar / En Camino
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                        onClick={() => updateStatus(order.id, 'completed')}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Marcar como Entregado
                                    </Button>
                                )}

                                <Button variant="ghost" className="text-zinc-500 hover:text-white text-xs" onClick={() => window.open(`http://wa.me/${order.cliente_telefono}`, '_blank')}>
                                    Contactar por WhatsApp
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {orders.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-xl">
                        <Bike className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                        <p className="text-muted-foreground text-lg">No hay entregas pendientes.</p>
                        <p className="text-muted-foreground/60">Cuando un pedido de delivery esté listo en cocina, aparecerá aquí.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
