'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, increment, arrayUnion, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Table, Product, Order } from '@/lib/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Trash2, ShoppingCart, Utensils, Receipt, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface TableOrderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    table: Table | null;
    tenantId: string;
}

export function TableOrderDialog({ isOpen, onClose, table, tenantId }: TableOrderDialogProps) {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    const [selectedItems, setSelectedItems] = useState<{ product: Product; quantity: number }[]>([]);

    useEffect(() => {
        if (!tenantId || !isOpen) return;

        // Load active products
        const q = query(
            collection(db, 'products'),
            where('tenantId', '==', tenantId),
            where('activo', '==', true),
            where('tipo', '==', 'producto')
        );

        getDocs(q).then(snapshot => {
            const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(productsData);
        });

        // If table is occupied, load its active order
        if (table?.order_id) {
            const unsubscribe = onSnapshot(doc(db, 'orders', table.order_id), (doc) => {
                if (doc.exists()) {
                    setActiveOrder({ id: doc.id, ...doc.data() } as Order);
                }
            });
            return () => unsubscribe();
        } else {
            setActiveOrder(null);
            setSelectedItems([]);
        }
    }, [tenantId, isOpen, table?.order_id]);

    const addToCart = (product: Product) => {
        setSelectedItems(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setSelectedItems(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setSelectedItems(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const handleCreateOrUpdateOrder = async () => {
        if (!table || !tenantId || selectedItems.length === 0) return;

        setLoading(true);
        try {
            const newItems = selectedItems.map(item => ({
                producto: item.product,
                cantidad: item.quantity,
                precio_venta_unitario: item.product.precio_venta,
                subtotal: item.product.precio_venta * item.quantity
            }));

            const orderTotalAddition = newItems.reduce((sum, item) => sum + item.subtotal, 0);

            if (table.order_id && activeOrder) {
                // ADD TO EXISTING ORDER
                const orderRef = doc(db, 'orders', table.order_id);
                await updateDoc(orderRef, {
                    items: arrayUnion(...newItems),
                    total: increment(orderTotalAddition),
                    updated_at: Timestamp.now()
                });
                toast.success('Pedido actualizado');
            } else {
                // CREATE NEW ORDER FROM SCRATCH (Not usual from here, usually table starts free)
                const { addDoc } = await import('firebase/firestore');
                const orderRef = await addDoc(collection(db, 'orders'), {
                    tenantId,
                    type: 'salon',
                    status: 'pending_kitchen',
                    items: newItems,
                    total: orderTotalAddition,
                    mesa: table.numero.toString(),
                    table_id: table.id,
                    fecha: Timestamp.now(),
                    updated_at: Timestamp.now(),
                    pagado: false
                });

                // Update table
                await updateDoc(doc(db, 'tables', table.id), {
                    estado: 'ocupada',
                    order_id: orderRef.id,
                    hora_ocupacion: Timestamp.now(),
                    updated_at: Timestamp.now()
                });
                toast.success('Mesa ocupada y pedido enviado');
            }

            setSelectedItems([]);
            if (!table.order_id) onClose();
        } catch (error) {
            console.error('Error in table order:', error);
            toast.error('Error al procesar pedido');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkForPayment = async () => {
        if (!table || !table.order_id) return;

        try {
            await updateDoc(doc(db, 'tables', table.id), {
                estado: 'pendiente_cobro',
                updated_at: Timestamp.now()
            });
            toast.success('Mesa marcada para cobro');
            onClose();
        } catch (error) {
            toast.error('Error al marcar mesa');
        }
    };

    const filteredProducts = products.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-card border-border text-foreground">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <Utensils className="w-6 h-6 text-primary" />
                                Mesa {table?.numero}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                {table?.estado === 'libre' ? 'Iniciar nuevo pedido' : 'Gestionar consumos actuales'}
                            </DialogDescription>
                        </div>
                        {activeOrder && (
                            <div className="text-right flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground">Total Acumulado</p>
                                    {activeOrder.pagado && (
                                        <Badge className="bg-emerald-500 text-white border-none py-0 h-5 px-2 text-[10px] animate-pulse">
                                            PAGADO
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-2xl font-black text-primary">{formatCurrency(activeOrder.total)}</p>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden py-4">
                    {/* Select Products */}
                    <div className="flex flex-col gap-4 overflow-hidden">
                        <Input
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-background border-border"
                        />
                        <div className="flex-1 border border-border rounded-xl bg-card p-2 overflow-y-auto max-h-[400px] custom-scrollbar">
                            <div className="grid grid-cols-1 gap-2">
                                {filteredProducts.map(product => (
                                    <div
                                        key={product.id}
                                        className="flex items-center justify-between p-3 bg-muted border-border rounded-lg hover:border-primary/50 cursor-pointer transition-colors"
                                        onClick={() => addToCart(product)}
                                    >
                                        <div>
                                            <p className="font-bold text-sm">{product.nombre}</p>
                                            <p className="text-xs text-muted-foreground">{product.categoria}</p>
                                        </div>
                                        <p className="font-bold text-primary">{formatCurrency(product.precio_venta)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Current / New Order Items */}
                    <div className="flex-col gap-4 overflow-hidden border-l border-border pl-6 hidden md:flex">
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4" /> Agregar al Pedido
                            </h3>
                            <div className="flex-1 mb-4 overflow-y-auto max-h-[300px] custom-scrollbar">
                                <div className="space-y-2">
                                    {selectedItems.map(item => (
                                        <div key={item.product.id} className="flex items-center justify-between bg-muted p-2 rounded-lg border border-border">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold">{item.product.nombre}</p>
                                                <p className="text-xs text-primary">{formatCurrency(item.product.precio_venta * item.quantity)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, -1)}>
                                                    <Minus className="w-4 h-4" />
                                                </Button>
                                                <span className="w-6 text-center font-bold">{item.quantity}</span>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, 1)}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400" onClick={() => removeFromCart(item.product.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedItems.length === 0 && (
                                        <p className="text-center text-muted-foreground py-10 italic">No hay productos seleccionados para agregar</p>
                                    )}
                                </div>
                            </div>

                            {activeOrder && (
                                <div className="border-t border-border pt-4 mt-auto">
                                    <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Ya consumido:</h3>
                                    <div className="h-32 overflow-y-auto custom-scrollbar">
                                        <div className="space-y-1">
                                            {activeOrder.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                                                    <span>{item.cantidad}x {item.producto.nombre}</span>
                                                    <span>{formatCurrency(item.subtotal)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t border-border pt-6">
                    <div className="flex-1 flex gap-2">
                        {activeOrder && !activeOrder.pagado && (
                            <Button
                                variant="outline"
                                className="flex-1 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                                onClick={handleMarkForPayment}
                            >
                                <Receipt className="w-4 h-4 mr-2" />
                                Cerrar Mesa (Cobrar)
                            </Button>
                        )}
                        {activeOrder?.pagado && (
                            <div className="flex-1 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-xs font-bold uppercase tracking-wider h-10">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Ya Cobrado en Caja
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8"
                            onClick={handleCreateOrUpdateOrder}
                            disabled={loading || selectedItems.length === 0}
                        >
                            {loading ? 'Procesando...' : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    {activeOrder ? 'Agregar al Pedido' : 'Abrir Mesa'}
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
