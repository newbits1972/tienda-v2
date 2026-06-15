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
import { ChefHat, Clock, Utensils, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function KitchenPage() {
    const { user } = useAuth();
    const { tenantId } = useTenant();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(db, 'orders'),
            where('tenantId', '==', tenantId),
            where('status', 'in', ['pending_kitchen', 'cooking']),
            orderBy('fecha', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            })) as Order[];
            setOrders(ordersData);
            setLoading(false);
        }, (error) => {
            console.error("Kitchen listener error:", error);
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
            toast.success(`Pedido actualizado a ${newStatus}`);
        } catch (error) {
            console.error("Error updating order:", error);
            toast.error("Error al actualizar el pedido");
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Cargando Comandas...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gold flex items-center gap-3">
                        <ChefHat className="w-8 h-8" />
                        Monitor de Cocina
                    </h1>
                    <p className="text-zinc-500">Gestión de comandas en tiempo real.</p>
                </div>
                <Badge variant="outline" className="border-gold/20 text-gold text-lg py-1 px-4">
                    {orders.length} Pedidos Activos
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {orders.map((order) => (
                    <Card key={order.id} className={`bg-zinc-950 border-zinc-800 flex flex-col ${order.status === 'cooking' ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : ''}`}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <Badge variant={order.type === 'delivery' ? 'destructive' : order.type === 'salon' ? 'gold' : 'outline'}>
                                    {order.type.toUpperCase()}
                                </Badge>
                                <span className="text-[10px] text-zinc-500 font-mono">#{order.id.slice(-4)}</span>
                            </div>
                            <CardTitle className="text-xl mt-2 flex items-center gap-2">
                                {order.type === 'salon' ? `Mesa ${order.mesa}` : order.cliente_nombre || 'Mostrador'}
                            </CardTitle>
                            <div className="flex items-center gap-1 text-xs text-zinc-500">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(toDate(order.fecha), { addSuffix: true, locale: es })}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <div className="space-y-2 border-y border-zinc-800 py-3">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="border-b border-zinc-900 last:border-0 py-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-bold text-lg text-white">
                                                {item.producto.es_pesable ? `${(item.peso_gramos || 0) / 1000}kg` : `${item.cantidad}x`} {item.producto.nombre}
                                            </span>
                                        </div>
                                        {/* Variants */}
                                        {item.selectedVariants && Object.entries(item.selectedVariants).map(([key, val]: [string, any]) => (
                                            <div key={key} className="text-xs text-zinc-400 ml-4 font-medium italic">
                                                - {key}: {val.nombre}
                                            </div>
                                        ))}
                                        {/* Extras */}
                                        {item.selectedExtras && item.selectedExtras.map((extra: any, i: number) => (
                                            <div key={i} className="text-xs text-zinc-400 ml-4 font-medium italic">
                                                + Extra: {extra.nombre}
                                            </div>
                                        ))}
                                        {/* Item Notes */}
                                        {item.notas && (
                                            <div className="text-xs text-gold ml-4 mt-1 bg-gold/5 p-1 rounded border-l border-gold">
                                                Nota: {item.notas}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {order.notas && (
                                <div className="bg-zinc-900 p-2 rounded text-xs text-zinc-400 italic">
                                    Nota: {order.notas}
                                </div>
                            )}

                            <div className="pt-2 flex gap-2">
                                {order.status === 'pending_kitchen' ? (
                                    <Button
                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
                                        onClick={() => updateStatus(order.id, 'cooking')}
                                    >
                                        <Utensils className="w-4 h-4 mr-2" />
                                        Empezar
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                        onClick={() => updateStatus(order.id, 'ready')}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Listo
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {orders.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                        <Utensils className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-500 text-lg">No hay comandas pendientes.</p>
                        <p className="text-zinc-600">Los pedidos nuevos aparecerán aquí automáticamente.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
