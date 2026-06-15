'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, Timestamp, runTransaction } from 'firebase/firestore';
import { RotateCcw, Plus, Calendar, Building2, Package, Trash2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase/config';
import { Product, Supplier, MerchandiseReturn, ReturnStatus } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
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

export default function ReturnsPage() {
    const [returns, setReturns] = useState<MerchandiseReturn[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const { user } = useAuth();

    // Form state
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [note, setNote] = useState('');
    const [cart, setCart] = useState<{
        productId: string;
        nombre: string;
        quantity: number;
        cost: number;
        unidad: string;
        motivo: string;
    }[]>([]);

    // Current item being added
    const [currentItemId, setCurrentItemId] = useState('');
    const [currentQty, setCurrentQty] = useState(1);
    const [currentReason, setCurrentReason] = useState('Vencimiento');

    useEffect(() => {
        const qReturns = query(collection(db, 'merchandise_returns'));
        const unsubscribeReturns = onSnapshot(qReturns, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MerchandiseReturn[];
            setReturns(data.sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis()));
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
            unsubscribeReturns();
            unsubscribeProducts();
            unsubscribeSuppliers();
        };
    }, []);

    const addToCart = () => {
        if (!currentItemId || currentQty <= 0) return;
        const product = products.find(p => p.id === currentItemId);
        if (!product) return;

        setCart([...cart, {
            productId: currentItemId,
            nombre: product.nombre,
            quantity: currentQty,
            cost: product.precio_costo || 0,
            unidad: product.unidad || (product.es_pesable ? 'kg' : 'un.'),
            motivo: currentReason
        }]);

        setCurrentItemId('');
        setCurrentQty(1);
        setCurrentReason('Vencimiento');
    };

    const removeItem = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const handleSaveReturn = async () => {
        if (!selectedSupplierId || cart.length === 0) {
            alert('Por favor seleccione un proveedor y agregue productos.');
            return;
        }

        setLoading(true);
        try {
            await runTransaction(db, async (transaction) => {
                const returnItems = cart.map(item => ({
                    producto_id: item.productId,
                    nombre: item.nombre,
                    cantidad: item.quantity,
                    unidad: item.unidad,
                    precio_costo: item.cost,
                    subtotal: item.quantity * item.cost,
                    motivo: item.motivo
                }));

                const total = returnItems.reduce((sum, item) => sum + item.subtotal, 0);

                // 1. COLLECT ALL READS FIRST
                const productRefs = cart.map(item => doc(db, 'products', item.productId));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                // 2. EXECUTE ALL WRITES
                const returnRef = doc(collection(db, 'merchandise_returns'));
                const returnData: MerchandiseReturn = {
                    id: returnRef.id,
                    proveedor_id: selectedSupplierId,
                    fecha: Timestamp.now(),
                    items: returnItems,
                    total: total,
                    estado: 'pendiente',
                    nota: note,
                    usuario_id: user?.id || 'unknown',
                    created_at: Timestamp.now(),
                    updated_at: Timestamp.now()
                };

                transaction.set(returnRef, returnData);

                // Update Stocks (Decrement)
                cart.forEach((item, index) => {
                    const productDoc = productDocs[index];
                    if (productDoc.exists()) {
                        const currentStock = productDoc.data().stock_actual || 0;
                        transaction.update(productRefs[index], {
                            stock_actual: currentStock - item.quantity,
                            updated_at: Timestamp.now()
                        });
                    }
                });
            });

            setIsDialogOpen(false);
            setCart([]);
            setNote('');
            setSelectedSupplierId('');
            alert('Devolución registrada con éxito. El stock ha sido actualizado.');
        } catch (error) {
            console.error('Error recording return:', error);
            alert('Error al registrar la devolución');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: ReturnStatus) => {
        const styles = {
            pendiente: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            enviado: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            acreditado: 'bg-green-500/10 text-green-500 border-green-500/20',
            rechazado: 'bg-red-500/10 text-red-500 border-red-500/20',
        };
        return <Badge variant="outline" className={styles[status]}>{status.toUpperCase()}</Badge>;
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <RotateCcw className="w-8 h-8" />
                        Devolución de Mercadería
                    </h1>
                    <p className="text-muted-foreground">Gestión de vencimientos y retiros a proveedores</p>
                </div>
                <Button variant="default" className="gap-2" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Nueva Devolución
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Devoluciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border text-left text-muted-foreground text-xs uppercase tracking-wider">
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Proveedor</th>
                                        <th className="p-4 text-center">Productos</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4 text-right">Total Est.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {returns.map((ret) => (
                                        <tr key={ret.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-primary" />
                                                    {ret.fecha.toDate().toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {suppliers.find(s => s.id === ret.proveedor_id)?.nombre || 'Desconocido'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <Badge variant="secondary">
                                                    {ret.items.length} ítems
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                {getStatusBadge(ret.estado)}
                                            </td>
                                            <td className="p-4 text-right font-bold text-primary">
                                                {formatCurrency(ret.total)}
                                            </td>
                                        </tr>
                                    ))}
                                    {returns.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-muted-foreground italic">
                                                No hay registros de devoluciones.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Nueva Devolución Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <RotateCcw className="w-6 h-6" />
                            Registrar Devolución
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        {/* Selector de Proveedor */}
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
                            <Label>Nota / Observación (Opcional)</Label>
                            <Input
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Ej: Camión de lácteos del jueves"
                            />
                        </div>

                        {/* Agregar Producto Form */}
                        <div className="md:col-span-2 p-4 bg-primary/5 border border-primary/10 rounded-lg space-y-4">
                            <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Agregar Ítem a Devolver
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="md:col-span-1 space-y-1">
                                    <Label className="text-xs text-muted-foreground">Producto</Label>
                                    <Select value={currentItemId} onValueChange={setCurrentItemId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Buscar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.filter(p => p.activo).map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                        Cant. {currentItemId && `(${products.find(p => p.id === currentItemId)?.unidad || (products.find(p => p.id === currentItemId)?.es_pesable ? 'kg' : 'un.')})`}
                                    </Label>
                                    <Input
                                        type="number"
                                        value={currentQty}
                                        onChange={(e) => setCurrentQty(Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Motivo</Label>
                                    <Select value={currentReason} onValueChange={setCurrentReason}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Vencimiento">Vencimiento</SelectItem>
                                            <SelectItem value="Mal Estado">Mal Estado</SelectItem>
                                            <SelectItem value="Error Pedido">Error Pedido</SelectItem>
                                            <SelectItem value="Otro">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button variant="outline" onClick={addToCart}>
                                    Agregar
                                </Button>
                            </div>
                        </div>

                        {/* Listado de items a devolver */}
                        <div className="md:col-span-2 overflow-x-auto max-h-[250px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-card">
                                    <tr className="text-muted-foreground border-b border-border text-left">
                                        <th className="py-2">Producto</th>
                                        <th className="py-2 text-center">Cant.</th>
                                        <th className="py-2">Motivo</th>
                                        <th className="py-2 text-right">Costo Est.</th>
                                        <th className="py-2 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, idx) => (
                                        <tr key={idx} className="border-b border-border group">
                                            <td className="py-3 font-medium">{item.nombre}</td>
                                            <td className="py-3 text-center">
                                                <Badge variant="outline" className="text-primary border-primary/20">
                                                    {item.quantity} {item.unidad}
                                                </Badge>
                                            </td>
                                            <td className="py-3 text-muted-foreground text-xs italic">{item.motivo}</td>
                                            <td className="py-3 text-right">
                                                {formatCurrency(item.quantity * item.cost)}
                                            </td>
                                            <td className="py-3 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(idx)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {cart.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
                                                Aún no has agregado productos a la lista.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="border-t border-border pt-4 flex justify-between items-center">
                        <div className="text-muted-foreground text-sm">
                            Subtotal Estimado: <span className="text-xl font-bold text-primary ml-2">
                                {formatCurrency(cart.reduce((sum, i) => sum + (i.quantity * i.cost), 0))}
                            </span>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button variant="default" onClick={handleSaveReturn} disabled={loading || cart.length === 0}>
                                {loading ? 'Registrando...' : 'Finalizar Devolución'}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
