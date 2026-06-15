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
import { User, CheckCircle2, UtensilsCrossed } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useModuleStatus } from '@/hooks/useModuleStatus';

export default function WaiterPage() {
    const { user } = useAuth();
    const { tenantId } = useTenant();
    const { protectRoute } = useModuleStatus();

    protectRoute('waiter');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) return;

        // Query orders that are READY and are either 'salon' or 'mostrador' (pickup)
        const q = query(
            collection(db, 'orders'),
            where('tenantId', '==', tenantId),
            where('status', '==', 'ready'),
            where('type', 'in', ['salon', 'mostrador']),
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
            console.error("Waiter listener error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    const markAsDelivered = async (order: Order) => {
        try {
            const orderRef = doc(db, 'orders', order.id);
            const { runTransaction } = await import('firebase/firestore');
            await runTransaction(db, async (transaction) => {
                // Update Order Status
                transaction.update(orderRef, {
                    status: 'completed',
                    updated_at: Timestamp.now()
                });

                // IF PAID: Auto-free the Table
                if (order.pagado && order.table_id) {
                    const tableRef = doc(db, 'tables', order.table_id);
                    transaction.update(tableRef, {
                        estado: 'libre',
                        order_id: null,
                        cliente_nombre: null,
                        hora_ocupacion: null,
                        updated_at: Timestamp.now()
                    });
                }
            });
            toast.success(order.pagado ? '¡Pedido entregado y mesa liberada!' : '¡Pedido entregado!');
        } catch (error) {
            console.error("Error updating order:", error);
            toast.error("Error al actualizar");
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando Comandas Listas...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gold flex items-center gap-3">
                        <UtensilsCrossed className="w-8 h-8" />
                        Estación de Mozos
                    </h1>
                    <p className="text-muted-foreground">Pedidos listos para servir en mesa.</p>
                </div>
                <Badge variant="outline" className="border-gold/20 text-gold text-lg py-1 px-4">
                    {orders.length} Listos
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {orders.map((order) => (
                    <Card key={order.id} className="bg-card border-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col relative overflow-hidden">
                        {/* Glow effect for ready orders */}
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />

                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <Badge variant={order.type === 'salon' ? 'gold' : 'secondary'} className="font-bold">
                                    {order.type === 'salon' ? `MESA ${order.mesa}` : 'MOSTRADOR'}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-mono">#{order.id.slice(-4)}</span>
                            </div>
                            <CardTitle className="text-xl mt-3 flex items-center justify-between text-foreground">
                                {order.cliente_nombre || 'Cliente Anónimo'}
                                {order.pagado && (
                                    <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px] animate-pulse">
                                        PAGADO
                                    </Badge>
                                )}
                            </CardTitle>
                            <div className="text-xs text-muted-foreground">
                                Listo {formatDistanceToNow(toDate(order.updated_at), { addSuffix: true, locale: es })}
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 space-y-4 flex flex-col">
                            <div className="flex-1 bg-muted/50 rounded-lg p-3 space-y-2">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm text-foreground">
                                        <span className="font-medium">
                                            {item.cantidad}x {item.producto.nombre}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {order.notas && (
                                <div className="text-xs text-orange-300 italic px-2">
                                    Nota: {order.notas}
                                </div>
                            )}

                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-lg shadow-lg shadow-emerald-900/20"
                                onClick={() => markAsDelivered(order)}
                            >
                                <CheckCircle2 className="w-6 h-6 mr-2" />
                                {order.pagado ? 'Entregar y Cerrar Mesa' : 'Servido / Entregado'}
                            </Button>
                        </CardContent>
                    </Card>
                ))}

                {orders.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                        <UtensilsCrossed className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-muted-foreground">Todo servido</h3>
                        <p className="text-muted-foreground/60 mt-2">No hay platos esperando para salir.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
