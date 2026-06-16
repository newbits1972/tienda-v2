'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, Timestamp, runTransaction, where, getDocs, addDoc } from 'firebase/firestore';
import { RotateCcw, Plus, Calendar, Building2, Package, Trash2, AlertCircle, Search, Store, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase/config';
import { Product, Supplier, MerchandiseReturn, ReturnStatus, Sale, OnlineOrder, StoreReturn, ReturnReason } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
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
import { toast } from 'sonner';

type ReturnTab = 'supplier' | 'customer';

const reasonLabels: Record<ReturnReason, string> = {
    producto_defectuoso: 'Producto defectuoso',
    producto_incorrecto: 'Producto incorrecto',
    cambio_de_opinion: 'Cambio de opinión',
    vencimiento: 'Vencimiento',
    otro: 'Otro',
};

export default function ReturnsPage() {
    const [tab, setTab] = useState<ReturnTab>('supplier');
    const { user } = useAuth();
    const { tenantId } = useTenant();

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <RotateCcw className="w-8 h-8" />
                        Devoluciones
                    </h1>
                    <p className="text-muted-foreground">Gestión de devoluciones a proveedores y de clientes</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-muted p-1 rounded-lg border border-border w-fit">
                <Button
                    variant={tab === 'supplier' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTab('supplier')}
                    className="rounded-md px-4"
                >
                    <Building2 className="w-4 h-4 mr-2" />
                    A Proveedores
                </Button>
                <Button
                    variant={tab === 'customer' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTab('customer')}
                    className="rounded-md px-4"
                >
                    <Store className="w-4 h-4 mr-2" />
                    De Clientes (BORIS)
                </Button>
            </div>

            {tab === 'supplier' ? <SupplierReturns /> : <CustomerReturns />}
        </div>
    );
}

function SupplierReturns() {
    const [returns, setReturns] = useState<MerchandiseReturn[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

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

                const productRefs = cart.map(item => doc(db, 'products', item.productId));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

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
            toast.success('Devolución registrada con éxito');
        } catch (error) {
            console.error('Error recording return:', error);
            toast.error('Error al registrar la devolución');
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
        <>
            <div className="flex justify-end mb-4">
                <Button variant="default" className="gap-2" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Nueva Devolución
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Devoluciones a Proveedores</CardTitle>
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
                                            No hay registros de devoluciones a proveedores.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <RotateCcw className="w-6 h-6" />
                            Registrar Devolución a Proveedor
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
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
                            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Camión de lácteos del jueves" />
                        </div>
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
                                    <Label className="text-xs text-muted-foreground">Cant.</Label>
                                    <Input type="number" value={currentQty} onChange={(e) => setCurrentQty(Number(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Motivo</Label>
                                    <Select value={currentReason} onValueChange={setCurrentReason}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Vencimiento">Vencimiento</SelectItem>
                                            <SelectItem value="Mal Estado">Mal Estado</SelectItem>
                                            <SelectItem value="Error Pedido">Error Pedido</SelectItem>
                                            <SelectItem value="Otro">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button variant="outline" onClick={addToCart}>Agregar</Button>
                            </div>
                        </div>
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
                                            <td className="py-3 text-right">{formatCurrency(item.quantity * item.cost)}</td>
                                            <td className="py-3 text-center">
                                                <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button variant="default" onClick={handleSaveReturn} disabled={loading || cart.length === 0}>
                                {loading ? 'Registrando...' : 'Finalizar Devolución'}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function CustomerReturns() {
    const { tenantId } = useTenant();
    const [returns, setReturns] = useState<StoreReturn[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<'sale' | 'online'>('sale');
    const [searchResults, setSearchResults] = useState<(Sale | OnlineOrder)[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Sale | OnlineOrder | null>(null);
    const [returnItems, setReturnItems] = useState<{ producto_id: string; producto_nombre: string; cantidad: number; precio_unitario: number; subtotal: number; motivo: ReturnReason }[]>([]);
    const [reembolso, setReembolso] = useState<'efectivo' | 'mismo_metodo' | 'credito_tienda'>('mismo_metodo');
    const [searching, setSearching] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (!tenantId) return;
        const q = query(collection(db, 'store_returns'), where('tenantId', '==', tenantId));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as StoreReturn));
            setReturns(data.sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis()));
        });
        return () => unsub();
    }, [tenantId]);

    const handleSearch = async () => {
        if (!tenantId || !searchTerm) return;
        setSearching(true);
        try {
            if (searchType === 'sale') {
                const snap = await getDocs(query(collection(db, 'sales'), where('tenantId', '==', tenantId)));
                const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
                setSearchResults(all.filter(s => s.id.includes(searchTerm) || (s.numero_comprobante && s.numero_comprobante.includes(searchTerm))));
            } else {
                const snap = await getDocs(query(collection(db, 'online_orders'), where('tenantId', '==', tenantId)));
                const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as OnlineOrder));
                setSearchResults(all.filter(o => o.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) || o.cliente_telefono.includes(searchTerm) || o.id.includes(searchTerm)));
            }
        } catch (error) {
            toast.error('Error al buscar');
        } finally {
            setSearching(false);
        }
    };

    const selectOrder = (order: Sale | OnlineOrder) => {
        setSelectedOrder(order);
        const items = (order as any).items?.map((item: any) => ({
            producto_id: item.producto?.id || '',
            producto_nombre: item.producto?.nombre || 'Producto',
            cantidad: 0,
            precio_unitario: item.producto?.precio_venta || 0,
            subtotal: item.subtotal || 0,
            motivo: 'otro' as ReturnReason,
        })) || [];
        setReturnItems(items);
    };

    const toggleItem = (index: number) => {
        setReturnItems(prev => prev.map((item, i) =>
            i === index ? { ...item, cantidad: item.cantidad > 0 ? 0 : 1 } : item
        ));
    };

    const setReason = (index: number, motivo: ReturnReason) => {
        setReturnItems(prev => prev.map((item, i) => i === index ? { ...item, motivo } : item));
    };

    const totalReturn = returnItems.reduce((sum, item) => sum + (item.precio_unitario * item.cantidad), 0);

    const handleSubmit = async () => {
        if (!user?.id || !tenantId || !selectedOrder) return;
        const itemsToReturn = returnItems.filter(i => i.cantidad > 0);
        if (itemsToReturn.length === 0) { toast.error('Seleccioná al menos un producto'); return; }

        try {
            const clientName = 'cliente_nombre' in selectedOrder ? (selectedOrder as OnlineOrder).cliente_nombre : 'Cliente';
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
        } catch (error) {
            toast.error('Error al registrar devolución');
        }
    };

    const resetForm = () => {
        setSelectedOrder(null);
        setReturnItems([]);
        setSearchTerm('');
        setSearchResults([]);
        setIsDialogOpen(false);
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button variant="default" className="gap-2" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Nueva Devolución de Cliente
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Devoluciones de Clientes (BORIS)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border text-left text-muted-foreground text-xs uppercase tracking-wider">
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Origen</th>
                                    <th className="p-4">Reembolso</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-right">Total</th>
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
                                        <td className="p-4 font-medium">{ret.cliente_nombre}</td>
                                        <td className="p-4">
                                            <Badge variant="outline" className="text-[10px]">
                                                {ret.tipo_origen === 'online_order' ? 'Online' : 'Tienda'}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-xs text-muted-foreground capitalize">
                                            {ret.metodo_reembolso === 'mismo_metodo' ? 'Mismo método' : ret.metodo_reembolso === 'credito_tienda' ? 'Crédito' : 'Efectivo'}
                                        </td>
                                        <td className="p-4">
                                            <Badge variant="outline" className={ret.estado === 'aprobado' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}>
                                                {ret.estado.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-right font-bold text-primary">{formatCurrency(ret.total)}</td>
                                    </tr>
                                ))}
                                {returns.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-muted-foreground italic">
                                            No hay devoluciones de clientes registradas.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <RotateCcw className="w-5 h-5 text-primary" />
                            Devolución de Cliente
                        </DialogTitle>
                    </DialogHeader>

                    {!selectedOrder ? (
                        <div className="space-y-4 py-4">
                            <div className="flex gap-2">
                                <Button variant={searchType === 'sale' ? 'default' : 'outline'} size="sm" onClick={() => setSearchType('sale')}>Ventas en Tienda</Button>
                                <Button variant={searchType === 'online' ? 'default' : 'outline'} size="sm" onClick={() => setSearchType('online')}>Pedidos Online</Button>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input placeholder={searchType === 'sale' ? 'ID de venta o comprobante...' : 'Nombre, teléfono o ID...'} className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                                </div>
                                <Button onClick={handleSearch} disabled={searching}>{searching ? 'Buscando...' : 'Buscar'}</Button>
                            </div>
                            {searchResults.length > 0 && (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {searchResults.map((order) => {
                                        const isOnline = 'cliente_nombre' in order;
                                        const orderData = order as any;
                                        return (
                                            <button key={order.id} onClick={() => selectOrder(order)} className="w-full text-left p-3 rounded-xl bg-muted/30 border border-border hover:border-primary/50 transition-all">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-sm text-foreground">{isOnline ? orderData.cliente_nombre : `Venta #${order.id.slice(-6)}`}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">{order.id}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-primary">{formatCurrency(order.total)}</p>
                                                        <Badge variant="outline" className="text-[9px]">{isOnline ? 'Online' : 'Tienda'}</Badge>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-foreground">{'cliente_nombre' in selectedOrder ? (selectedOrder as OnlineOrder).cliente_nombre : `Venta #${selectedOrder.id.slice(-6)}`}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{selectedOrder.id}</p>
                                </div>
                                <Badge variant="outline">{'tipo_entrega' in selectedOrder ? 'Pedido Online' : 'Venta en Tienda'}</Badge>
                            </div>

                            <div className="space-y-2">
                                {returnItems.map((item, idx) => (
                                    <div key={idx} className={`p-3 rounded-xl border transition-all ${item.cantidad > 0 ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <input type="checkbox" checked={item.cantidad > 0} onChange={() => toggleItem(idx)} className="w-4 h-4 accent-primary" />
                                                <div>
                                                    <p className="font-bold text-sm text-foreground">{item.producto_nombre}</p>
                                                    <p className="text-xs text-muted-foreground">{formatCurrency(item.precio_unitario)} c/u</p>
                                                </div>
                                            </div>
                                            {item.cantidad > 0 && <p className="font-bold text-primary">{formatCurrency(item.precio_unitario)}</p>}
                                        </div>
                                        {item.cantidad > 0 && (
                                            <div className="mt-2 pl-7">
                                                <Label className="text-[10px] text-muted-foreground">Motivo</Label>
                                                <select value={item.motivo} onChange={(e) => setReason(idx, e.target.value as ReturnReason)} className="w-full mt-1 h-8 text-xs rounded-lg bg-muted border-border px-2">
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
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reembolso</Label>
                                <select value={reembolso} onChange={(e) => setReembolso(e.target.value as any)} className="w-full h-10 rounded-xl bg-muted border-border px-3 text-sm">
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
                                <Button variant="ghost" onClick={resetForm} className="flex-1">Volver</Button>
                                <Button onClick={handleSubmit} className="flex-1" disabled={totalReturn <= 0}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Registrar
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
