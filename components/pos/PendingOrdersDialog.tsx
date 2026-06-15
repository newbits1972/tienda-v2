'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OnlineOrder } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBag, User, Phone, MessageSquare, ArrowRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingOrdersDialogProps {
    orders: OnlineOrder[];
    isOpen: boolean;
    onClose: () => void;
    onLoadOrder: (order: OnlineOrder) => void;
}

export function PendingOrdersDialog({ orders, isOpen, onClose, onLoadOrder }: PendingOrdersDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-card border-gold/20">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-gold" />
                        Pedidos Online Pendientes
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Gestioná los pedidos recibidos desde el catálogo online.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {orders.length === 0 ? (
                        <div className="text-center py-10">
                            <ShoppingBag className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-muted-foreground">No hay pedidos pendientes actualmente.</p>
                        </div>
                    ) : (
                        orders.map((order) => (
                            <div
                                key={order.id}
                                className="p-4 rounded-lg bg-card border border-border hover:border-gold/30 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-foreground text-lg">{order.cliente_nombre}</span>
                                            <Badge className="bg-gold/10 text-gold border-gold/20 text-[10px] uppercase">
                                                NUEVO
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {order.cliente_telefono}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {format(order.fecha.toDate(), 'HH:mm', { locale: es })}hs
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-gold">{formatCurrency(order.total)}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase">{order.items.length} productos</p>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4 bg-muted/50 p-3 rounded-xl border border-border">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="space-y-1 pb-2 border-b border-border last:border-0 last:pb-0">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-bold text-zinc-300">{item.cantidad}x {item.producto.nombre}</span>
                                                <span className="font-bold text-gold">{formatCurrency(item.subtotal)}</span>
                                            </div>

                                            {/* Details: Variants & Extras */}
                                            {(item.selectedVariants || (item.selectedExtras && item.selectedExtras.length > 0)) && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {item.selectedVariants && Object.entries(item.selectedVariants).map(([variety, opt]: [string, any]) => (
                                                        <Badge key={variety} variant="outline" className="text-[10px] py-0 h-4 border-border text-muted-foreground capitalize bg-muted">
                                                            {opt.nombre}
                                                        </Badge>
                                                    ))}
                                                    {item.selectedExtras && item.selectedExtras.map((extra: any, eIdx: number) => (
                                                        <Badge key={eIdx} variant="outline" className="text-[10px] py-0 h-4 border-gold/20 text-gold bg-gold/5 uppercase">
                                                            +{extra.nombre}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}

                                            {item.notas && (
                                                <p className="text-[10px] text-muted-foreground italic mt-1 leading-tight bg-muted p-1 px-2 rounded">
                                                    "{item.notas}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="flex-1 text-xs"
                                        variant="gold"
                                        onClick={() => {
                                            const message = encodeURIComponent(order.mensaje_whatsapp || '');
                                            window.open(`https://wa.me/${order.cliente_telefono}?text=${message}`, '_blank');
                                        }}
                                    >
                                        <MessageSquare className="w-3 h-3 mr-2" />
                                        WhatsApp
                                    </Button>
                                    <Button
                                        variant="gold"
                                        size="sm"
                                        className="flex-1 text-xs"
                                        onClick={() => onLoadOrder(order)}
                                    >
                                        <ArrowRight className="w-3 h-3 mr-2" />
                                        Cargar Pedido
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <Button variant="gold" onClick={onClose} className="w-full">
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
