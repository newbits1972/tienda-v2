'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { ShoppingCart, Plus, Search, Calendar, Building2, Package, BadgeDollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase/config';
import { Product, Supplier, PurchaseInvoice } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function PurchasesPage() {
    const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [cart, setCart] = useState<{ productId: string; quantity: number; cost: number }[]>([]);

    // Current item being added
    const [currentItemId, setCurrentItemId] = useState('');
    const [currentQty, setCurrentQty] = useState(1);
    const [currentCost, setCurrentCost] = useState(0);

    useEffect(() => {
        const qPurchases = query(collection(db, 'purchases'));
        const unsubscribePurchases = onSnapshot(qPurchases, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PurchaseInvoice[];
            setPurchases(data.sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis()));
        });

        const qProducts = query(collection(db, 'products'));
        const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
            setProducts(data);
        });

        const qSuppliers = query(collection(db, 'suppliers'));
        const unsubscribeSuppliers = onSnapshot(qSuppliers, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Supplier[];
            setSuppliers(data);
        });

        return () => {
            unsubscribePurchases();
            unsubscribeProducts();
            unsubscribeSuppliers();
        };
    }, []);

    const addToCart = () => {
        if (!currentItemId || currentQty <= 0) return;
        setCart([...cart, { productId: currentItemId, quantity: currentQty, cost: currentCost }]);
        setCurrentItemId('');
        setCurrentQty(1);
        setCurrentCost(0);
    };

    const handleSavePurchase = async () => {
        if (!selectedSupplierId || !invoiceNumber || cart.length === 0) {
            alert('Por favor complete todos los campos y agregue productos.');
            return;
        }

        setLoading(true);
        try {
            await runTransaction(db, async (transaction) => {
                const purchaseItems = cart.map(item => ({
                    producto_id: item.productId,
                    cantidad: item.quantity,
                    precio_unitario: item.cost,
                    subtotal: item.quantity * item.cost
                }));

                const total = purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);

                // 1. COLLECT ALL READS FIRST
                const productRefs = cart.map(item => doc(db, 'products', item.productId));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                // 2. EXECUTE ALL WRITES
                // Create Purchase Record
                const purchaseRef = doc(collection(db, 'purchases'));
                transaction.set(purchaseRef, {
                    proveedor_id: selectedSupplierId,
                    numero_factura: invoiceNumber,
                    fecha: Timestamp.now(),
                    items: purchaseItems,
                    total: total,
                    created_at: Timestamp.now()
                });

                // Update Stocks and Costs
                cart.forEach((item, index) => {
                    const productDoc = productDocs[index];
                    if (productDoc.exists()) {
                        const currentStock = productDoc.data().stock_actual || 0;
                        transaction.update(productRefs[index], {
                            stock_actual: currentStock + item.quantity,
                            precio_costo: item.cost, // Update cost price to last purchase price
                            updated_at: Timestamp.now()
                        });
                    }
                });
            });

            setIsDialogOpen(false);
            setCart([]);
            setInvoiceNumber('');
            setSelectedSupplierId('');
            alert('Compra registrada y stock actualizado.');
        } catch (error) {
            console.error('Error recording purchase:', error);
            alert('Error al registrar la compra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Registro de Compras</h1>
                    <p className="text-muted-foreground">Ingreso de mercadería y actualización de stock</p>
                </div>
                <Button variant="default" className="gap-2" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Nueva Compra
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Compras</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="p-3">Fecha</th>
                                        <th className="p-3">Factura</th>
                                        <th className="p-3">Proveedor</th>
                                        <th className="p-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchases.map((purchase) => (
                                        <tr key={purchase.id} className="border-b hover:bg-accent/50">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    {purchase.fecha.toDate().toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="p-3 font-mono">{purchase.numero_factura}</td>
                                            <td className="p-3">
                                                {suppliers.find(s => s.id === purchase.proveedor_id)?.nombre || 'Proveedor Desconocido'}
                                            </td>
                                            <td className="p-3 text-right font-bold text-gold">
                                                {formatCurrency(purchase.total)}
                                            </td>
                                        </tr>
                                    ))}
                                    {purchases.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                                No hay registros de compras.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Nueva Compra Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>Registrar Nueva Compra</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Proveedor</Label>
                            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar proveedor..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.filter(s => s.activo).map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>N° Factura</Label>
                            <Input
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                placeholder="0001-00001234"
                            />
                        </div>

                        <div className="col-span-2 border-t pt-4 mt-2">
                            <h4 className="font-semibold mb-3">Agregar Productos</h4>
                            <div className="grid grid-cols-4 gap-2 items-end">
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Producto</Label>
                                    <Select value={currentItemId} onValueChange={setCurrentItemId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Buscar producto..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.filter(p => p.activo).map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        Cant. {currentItemId && `(${products.find(p => p.id === currentItemId)?.unidad || (products.find(p => p.id === currentItemId)?.es_pesable ? 'kg' : 'un.')})`}
                                    </Label>
                                    <Input
                                        type="number"
                                        value={currentQty}
                                        onChange={(e) => setCurrentQty(Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Costo Unit.</Label>
                                    <Input
                                        type="number"
                                        value={currentCost}
                                        onChange={(e) => setCurrentCost(Number(e.target.value))}
                                    />
                                </div>
                                <Button className="col-span-4 mt-2" variant="outline" onClick={addToCart}>
                                    Agregar a la Lista
                                </Button>
                            </div>
                        </div>

                        {/* Cart Summary */}
                        <div className="col-span-2 mt-4 bg-accent/20 rounded-md p-3">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-2">Producto</th>
                                        <th className="pb-2 text-center">Cant.</th>
                                        <th className="pb-2 text-right">Costo</th>
                                        <th className="pb-2 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, idx) => {
                                        const p = products.find(prod => prod.id === item.productId);
                                        return (
                                            <tr key={idx} className="border-b border-accent/10">
                                                <td className="py-2">{p?.nombre}</td>
                                                <td className="py-2 text-center text-xs">
                                                    {item.quantity} {p?.unidad || (p?.es_pesable ? 'kg' : 'un.')}
                                                </td>
                                                <td className="py-2 text-right">{formatCurrency(item.cost)}</td>
                                                <td className="py-2 text-right font-semibold">
                                                    {formatCurrency(item.quantity * item.cost)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {cart.length > 0 && (
                                        <tr className="font-bold">
                                            <td colSpan={3} className="pt-2 text-right">TOTAL:</td>
                                            <td className="pt-2 text-right text-gold">
                                                {formatCurrency(cart.reduce((sum, i) => sum + (i.quantity * i.cost), 0))}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button variant="default" onClick={handleSavePurchase} disabled={loading}>
                            {loading ? 'Procesando...' : 'Finalizar e Ingresar Stock'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
