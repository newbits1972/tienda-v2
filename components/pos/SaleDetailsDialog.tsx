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
import { Sale, Customer } from '@/lib/types';
import { formatCurrency, toDate } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShoppingBag, Calendar, User, CreditCard, Receipt, Hash, Clock } from 'lucide-react';

interface SaleDetailsDialogProps {
    sale: Sale | null;
    customer: Customer | null;
    isOpen: boolean;
    onClose: () => void;
}

export function SaleDetailsDialog({ sale, customer, isOpen, onClose }: SaleDetailsDialogProps) {
    if (!sale) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] bg-card border-border">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <Receipt className="w-6 h-6 text-gold" />
                                Detalle de Venta
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground font-mono text-xs mt-1">
                                ID: {sale.id}
                            </DialogDescription>
                        </div>
                        <Badge variant="outline" className="text-gold border-gold/20 uppercase">
                            {sale.tipo_comprobante}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/50 rounded-lg border border-border">
                            <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1 mb-1">
                                <Calendar className="w-3 h-3" /> Fecha y Hora
                            </p>
                            <p className="text-sm font-medium text-foreground">
                                {format(toDate(sale.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}hs
                            </p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg border border-border">
                            <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1 mb-1">
                                <CreditCard className="w-3 h-3" /> Método de Pago
                            </p>
                            <p className="text-sm font-medium text-foreground capitalize">
                                {sale.metodo_pago.replace('_', ' ')}
                            </p>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                        <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1 mb-1">
                            <User className="w-3 h-3" /> Cliente
                        </p>
                        <p className="text-sm font-medium text-foreground">
                            {customer ? customer.nombre : 'Consumidor Final'}
                        </p>
                        {customer?.dni_cuit && (
                            <p className="text-[10px] text-zinc-500 mt-1">CUIT/DNI: {customer.dni_cuit}</p>
                        )}
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider px-1">Productos</p>
                        <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {sale.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-2 rounded bg-muted border border-border">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{item.producto.nombre}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.cantidad} un. x {formatCurrency(item.variante?.precio_venta ?? item.producto.precio_venta)}
                                        </p>
                                        {item.variante && (
                                            <p className="text-[10px] text-muted-foreground">
                                                {item.variante.color} · Talle {item.variante.talle}
                                            </p>
                                        )}
                                    </div>
                                    <p className="font-bold text-foreground">{formatCurrency(item.subtotal)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total Section */}
                    <div className="pt-4 border-t border-border">
                        <div className="flex justify-between items-center text-xl font-bold">
                            <span className="text-muted-foreground">TOTAL</span>
                            <span className="text-gold text-2xl">{formatCurrency(sale.total)}</span>
                        </div>
                    </div>

                    {/* Fiscal Info if available */}
                    {sale.cae && (
                        <div className="p-3 bg-gold/5 rounded-lg border border-gold/20 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-gold/60 uppercase font-bold">CAE Autorizado</p>
                                <p className="text-xs font-mono text-gold">{sale.cae}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gold/60 uppercase font-bold">Vence</p>
                                <p className="text-xs font-mono text-gold">
                                    {sale.vencimiento_cae ? format(toDate(sale.vencimiento_cae), 'dd/MM/yyyy') : '--'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={onClose} variant="gold" className="w-full">
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
