'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { OnlineOrder, OnlineOrderStatus } from '@/lib/types';
import { useModuleStatus } from '@/hooks/useModuleStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Store, Phone, Clock, CheckCircle2, Package, XCircle, Search, MapPin } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string }> = {
    pendiente: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    preparado: { label: 'Preparado', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    listo_para_retirar: { label: 'Listo para Retirar', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    retirado: { label: 'Retirado', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' },
    cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
    finalizado: { label: 'Finalizado', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' },
};

export default function PickupPage() {
    const { user } = useAuth();
    const { tenantId } = useTenant();
    const { protectRoute } = useModuleStatus();
    protectRoute('integrated_pos');

    const [orders, setOrders] = useState<OnlineOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(db, 'online_orders'),
            where('tenantId', '==', tenantId),
            where('tipo_entrega', '==', 'retiro_tienda')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OnlineOrder));
            data.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0));
            setOrders(data);
            setLoading(false);
        }, () => setLoading(false));

        return () => unsubscribe();
    }, [tenantId]);

    const updateStatus = async (orderId: string, newStatus: OnlineOrderStatus) => {
        try {
            await updateDoc(doc(db, 'online_orders', orderId), { estado: newStatus });
            toast.success(`Pedido: ${statusConfig[newStatus]?.label || newStatus}`);
        } catch (error) {
            toast.error('Error al actualizar');
        }
    };

    const filtered = search
        ? orders.filter(o =>
            o.cliente_nombre.toLowerCase().includes(search.toLowerCase()) ||
            o.cliente_telefono.includes(search))
        : orders;

    const grouped = {
        pendientes: filtered.filter(o => o.estado === 'pendiente' || o.estado === 'preparado'),
        listos: filtered.filter(o => o.estado === 'listo_para_retirar'),
        completados: filtered.filter(o => o.estado === 'retirado' || o.estado === 'cancelado' || o.estado === 'finalizado'),
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                        <Store className="w-8 h-8" />
                        Retiro en Tienda
                    </h1>
                    <p className="text-muted-foreground">Gestioná pedidos para retirar por clientes</p>
                </div>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar cliente..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-muted-foreground">Cargando...</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Pendientes */}
                    <section>
                        <h2 className="text-lg font-bold text-amber-500 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5" /> Pendientes ({grouped.pendientes.length})
                        </h2>
                        <div className="space-y-3">
                            {grouped.pendientes.map(order => (
                                <OrderCard key={order.id} order={order} onUpdate={updateStatus} />
                            ))}
                            {grouped.pendientes.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8">Sin pedidos pendientes</p>
                            )}
                        </div>
                    </section>

                    {/* Listos para Retirar */}
                    <section>
                        <h2 className="text-lg font-bold text-green-500 mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" /> Listos para Retirar ({grouped.listos.length})
                        </h2>
                        <div className="space-y-3">
                            {grouped.listos.map(order => (
                                <OrderCard key={order.id} order={order} onUpdate={updateStatus} />
                            ))}
                            {grouped.listos.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8">Sin pedidos listos</p>
                            )}
                        </div>
                    </section>

                    {/* Completados */}
                    <section>
                        <h2 className="text-lg font-bold text-muted-foreground mb-4 flex items-center gap-2">
                            <Package className="w-5 h-5" /> Historial ({grouped.completados.length})
                        </h2>
                        <div className="space-y-3">
                            {grouped.completados.map(order => (
                                <OrderCard key={order.id} order={order} onUpdate={updateStatus} />
                            ))}
                            {grouped.completados.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8">Sin historial</p>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

function OrderCard({ order, onUpdate }: { order: OnlineOrder; onUpdate: (id: string, status: OnlineOrderStatus) => void }) {
    const config = statusConfig[order.estado] || statusConfig.pendiente;

    return (
        <Card className={`border-border bg-card ${order.estado === 'listo_para_retirar' ? 'ring-1 ring-green-500/30' : ''}`}>
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-foreground">{order.cliente_nombre}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" /> {order.cliente_telefono}
                            <Clock className="w-3 h-3 ml-1" />
                            {format(order.fecha.toDate(), 'dd/MM HH:mm', { locale: es })}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-primary text-lg">{formatCurrency(order.total)}</p>
                        <Badge className={`text-[10px] ${config.color}`}>{config.label}</Badge>
                    </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-0.5 bg-muted/30 p-2 rounded-lg">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                            <span>{item.cantidad}x {item.producto.nombre}</span>
                            <span>{formatCurrency(item.subtotal)}</span>
                        </div>
                    ))}
                </div>

                <div className="flex gap-1.5 pt-1">
                    {(order.estado === 'pendiente' || order.estado === 'preparado') && (
                        <>
                            <Button size="sm" className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => onUpdate(order.id, 'listo_para_retirar')}>
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Listo para Retirar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive"
                                onClick={() => onUpdate(order.id, 'cancelado')}>
                                <XCircle className="w-3 h-3 mr-1" /> Cancelar
                            </Button>
                        </>
                    )}
                    {order.estado === 'listo_para_retirar' && (
                        <Button size="sm" className="flex-1 h-8 text-xs"
                            onClick={() => onUpdate(order.id, 'retirado')}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar como Retirado
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
