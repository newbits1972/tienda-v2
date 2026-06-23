'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Sale, OnlineOrder, StoreReturn, ReturnReason, ReturnItem } from '@/lib/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { Search, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ReturnDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const reasonLabels: Record<ReturnReason, string> = {
    producto_defectuoso: 'Producto defectuoso',
    producto_incorrecto: 'Producto incorrecto',
    cambio_de_opinion: 'Cambio de opinión',
    talle_incorrecto: 'Talle incorrecto',
    otro: 'Otro',
};

export function ReturnDialog({ isOpen, onClose }: ReturnDialogProps) {
    const { user } = useAuth();
    const { tenantId } = useTenant();
    const [searchType, setSearchType] = useState<'sale' | 'online'>('sale');
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<(Sale | OnlineOrder)[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Sale | OnlineOrder | null>(null);
    const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
    const [reembolso, setReembolso] = useState<'efectivo' | 'mismo_metodo' | 'credito_tienda'>('mismo_metodo');
    const [searching, setSearching] = useState(false);

    const isOnlineOrder = (o: Sale | OnlineOrder): o is OnlineOrder => {
        return 'tipo_entrega' in o;
    };

    const handleSearch = async () => {
        if (!tenantId || !searchTerm) return;
        setSearching(true);
        try {
            if (searchType === 'sale') {
                const q = query(
                    collection(db, 'sales'),
                    where('tenantId', '==', tenantId),
                );
                const snap = await getDocs(q);
                const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
                const filtered = all.filter(s =>
                    s.id.includes(searchTerm) ||
                    (s.numero_comprobante && s.numero_comprobante.includes(searchTerm))
                );
                setResults(filtered);
            } else {
                const q = query(
                    collection(db, 'online_orders'),
                    where('tenantId', '==', tenantId),
                );
                const snap = await getDocs(q);
                const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as OnlineOrder));
                const filtered = all.filter(o =>
                    o.id.includes(searchTerm) ||
                    o.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    o.cliente_telefono.includes(searchTerm)
                );
                setResults(filtered);
            }
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Error al buscar');
        } finally {
            setSearching(false);
        }
    };

    const selectOrder = (order: Sale | OnlineOrder) => {
        setSelectedOrder(order);
        const items: ReturnItem[] = (order as any).items?.map((item: any) => ({
            producto_id: item.producto?.id || item.producto_id || '',
            producto_nombre: item.producto?.nombre || item.producto_nombre || 'Producto',
            cantidad: 0,
            precio_unitario: item.producto?.precio_venta || item.precio_unitario || 0,
            subtotal: item.subtotal || 0,
            motivo: 'otro' as ReturnReason,
        })) || [];
        setReturnItems(items);
    };

    const toggleReturnItem = (index: number) => {
        setReturnItems(prev => prev.map((item, i) =>
            i === index ? { ...item, cantidad: item.cantidad > 0 ? 0 : 1 } : item
        ));
    };

    const setReturnReason = (index: number, motivo: ReturnReason) => {
        setReturnItems(prev => prev.map((item, i) =>
            i === index ? { ...item, motivo } : item
        ));
    };

    const totalReturn = returnItems.reduce((sum, item) => sum + (item.precio_unitario * item.cantidad), 0);

    const handleSubmit = async () => {
        if (!user?.id || !tenantId || !selectedOrder) return;

        const itemsToReturn = returnItems.filter(i => i.cantidad > 0);
        if (itemsToReturn.length === 0) {
            toast.error('Seleccioná al menos un producto para devolver');
            return;
        }

        try {
            const clientName = isOnlineOrder(selectedOrder)
                ? (selectedOrder as OnlineOrder).cliente_nombre
                : 'Cliente';

            await addDoc(collection(db, 'store_returns'), {
                tenantId,
                tipo_origen: searchType === 'sale' ? 'in_store_sale' : 'online_order',
                orden_original_id: selectedOrder.id,
                cliente_nombre: clientName,
                items: itemsToReturn,
                subtotal: totalReturn,
                total: totalReturn,
                metodo_reembolso: reembolso,
                estado: 'aprobado',
                usuario_id: user.id,
                fecha: Timestamp.now(),
            });

            toast.success('Devolución registrada exitosamente');
            resetForm();
            onClose();
        } catch (error) {
            console.error('Return error:', error);
            toast.error('Error al registrar devolución');
        }
    };

    const resetForm = () => {
        setSelectedOrder(null);
        setReturnItems([]);
        setSearchTerm('');
        setResults([]);
        setReembolso('mismo_metodo');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); onClose(); }}>
            <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <RotateCcw className="w-5 h-5 text-primary" />
                        Devoluciones (BORIS)
                    </DialogTitle>
                    <DialogDescription>
                        Buscá una venta o pedido online para procesar su devolución en tienda.
                    </DialogDescription>
                </DialogHeader>

                {!selectedOrder ? (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Button
                                variant={searchType === 'sale' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSearchType('sale')}
                            >
                                Ventas en Tienda
                            </Button>
                            <Button
                                variant={searchType === 'online' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSearchType('online')}
                            >
                                Pedidos Online
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder={searchType === 'sale' ? 'ID de venta o comprobante...' : 'Nombre, teléfono o ID del pedido...'}
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            <Button onClick={handleSearch} disabled={searching}>
                                {searching ? 'Buscando...' : 'Buscar'}
                            </Button>
                        </div>

                        {results.length > 0 && (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {results.map((order) => {
                                    const isOnline = isOnlineOrder(order);
                                    const orderData = order as any;
                                    return (
                                        <button
                                            key={order.id}
                                            onClick={() => selectOrder(order)}
                                            className="w-full text-left p-3 rounded-xl bg-muted/30 border border-border hover:border-primary/50 transition-all"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-sm text-foreground">
                                                        {isOnline ? orderData.cliente_nombre : `Venta #${order.id.slice(-6)}`}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground font-mono">
                                                        {order.id} {orderData.numero_comprobante && `| ${orderData.numero_comprobante}`}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-primary">{formatCurrency(order.total)}</p>
                                                    <Badge variant="outline" className="text-[9px]">
                                                        {isOnline ? 'Online' : 'Tienda'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-foreground">
                                    {isOnlineOrder(selectedOrder)
                                        ? (selectedOrder as OnlineOrder).cliente_nombre
                                        : `Venta #${selectedOrder.id.slice(-6)}`}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">{selectedOrder.id}</p>
                            </div>
                            <Badge variant="outline">{isOnlineOrder(selectedOrder) ? 'Pedido Online' : 'Venta en Tienda'}</Badge>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Seleccioná los productos a devolver
                            </Label>
                            {returnItems.map((item, idx) => (
                                <div key={idx} className={`p-3 rounded-xl border transition-all ${item.cantidad > 0 ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={item.cantidad > 0}
                                                onChange={() => toggleReturnItem(idx)}
                                                className="w-4 h-4 accent-primary"
                                            />
                                            <div>
                                                <p className="font-bold text-sm text-foreground">{item.producto_nombre}</p>
                                                <p className="text-xs text-muted-foreground">{formatCurrency(item.precio_unitario)} c/u</p>
                                            </div>
                                        </div>
                                        {item.cantidad > 0 && (
                                            <p className="font-bold text-primary">{formatCurrency(item.precio_unitario)}</p>
                                        )}
                                    </div>
                                    {item.cantidad > 0 && (
                                        <div className="mt-2 pl-7">
                                            <Label className="text-[10px] text-muted-foreground">Motivo</Label>
                                            <select
                                                value={item.motivo}
                                                onChange={(e) => setReturnReason(idx, e.target.value as ReturnReason)}
                                                className="w-full mt-1 h-8 text-xs rounded-lg bg-muted border-border px-2"
                                            >
                                                {Object.entries(reasonLabels).map(([key, label]) => (
                                                    <option key={key} value={key}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Método de Reembolso</Label>
                            <select
                                value={reembolso}
                                onChange={(e) => setReembolso(e.target.value as any)}
                                className="w-full h-10 rounded-xl bg-muted border-border px-3 text-sm"
                            >
                                <option value="mismo_metodo">Mismo método de pago</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="credito_tienda">Crédito en tienda</option>
                            </select>
                        </div>

                        <div className="bg-muted p-4 rounded-xl border border-border flex justify-between items-center">
                            <span className="font-bold text-foreground">Total a reembolsar</span>
                            <span className="text-2xl font-black text-primary">{formatCurrency(totalReturn)}</span>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="ghost" onClick={resetForm} className="flex-1">
                                Volver
                            </Button>
                            <Button onClick={handleSubmit} className="flex-1" disabled={totalReturn <= 0}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Registrar Devolución
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
