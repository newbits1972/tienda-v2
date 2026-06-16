'use client';

import React from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { OnlineOrder } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Store, Phone, Clock, CheckCircle2, Package, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface PickupPanelProps {
    orders: OnlineOrder[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
    pendiente: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    preparado: { label: 'Preparado', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    listo_para_retirar: { label: 'Listo para Retirar', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    retirado: { label: 'Retirado', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' },
    cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

export function PickupPanel({ orders }: PickupPanelProps) {
    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, 'online_orders', orderId), {
                estado: newStatus,
            });
            toast.success(`Pedido marcado como: ${statusConfig[newStatus]?.label || newStatus}`);
        } catch (error) {
            console.error('Error updating pickup order:', error);
            toast.error('Error al actualizar el pedido');
        }
    };

    const pickupOrders = orders.filter(o => o.tipo_entrega === 'retiro_tienda' && o.estado !== 'retirado' && o.estado !== 'cancelado');

    return (
        <Card className="border-border bg-card">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Store className="w-5 h-5 text-primary" />
                        Retiro en Tienda
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                        {pickupOrders.length} pendientes
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {pickupOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No hay pedidos para retirar</p>
                    </div>
                ) : (
                    pickupOrders.map((order) => {
                        const statusStyle = statusConfig[order.estado] || statusConfig.pendiente;
                        return (
                            <div key={order.id} className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{order.cliente_nombre}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <Phone className="w-3 h-3" />
                                            <span>{order.cliente_telefono}</span>
                                            <Clock className="w-3 h-3 ml-1" />
                                            <span>{format(order.fecha.toDate(), 'HH:mm', { locale: es })}hs</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-primary">{formatCurrency(order.total)}</p>
                                        <Badge className={`text-[9px] py-0 h-4 ${statusStyle.color}`}>
                                            {statusStyle.label}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="text-[10px] text-muted-foreground space-y-0.5">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>{item.cantidad}x {item.producto.nombre}</span>
                                            <span>{formatCurrency(item.subtotal)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-1.5 pt-1">
                                    {order.estado === 'pendiente' && (
                                        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]"
                                            onClick={() => updateStatus(order.id, 'listo_para_retirar')}>
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Listo para Retirar
                                        </Button>
                                    )}
                                    {order.estado === 'listo_para_retirar' && (
                                        <Button size="sm" variant="default" className="flex-1 h-7 text-[10px] bg-green-600 hover:bg-green-700"
                                            onClick={() => updateStatus(order.id, 'retirado')}>
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Marcar como Retirado
                                        </Button>
                                    )}
                                    {order.estado === 'preparado' && (
                                        <Button size="sm" className="flex-1 h-7 text-[10px] bg-green-600 hover:bg-green-700"
                                            onClick={() => updateStatus(order.id, 'listo_para_retirar')}>
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Listo para Retirar
                                        </Button>
                                    )}
                                    {(order.estado === 'pendiente' || order.estado === 'preparado') && (
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive"
                                            onClick={() => updateStatus(order.id, 'cancelado')}>
                                            <XCircle className="w-3 h-3 mr-1" />
                                            Cancelar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
