'use client';

import React, { useState, useEffect } from 'react';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    Timestamp,
    query,
    where,
    getDocs,
    writeBatch,
    orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    ShoppingCart,
    Search,
    Plus,
    Trash2,
    AlertTriangle,
    Save
} from 'lucide-react';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Provider {
    id: string;
    nombre: string;
}

interface PurchaseItem {
    productId: string;
    nombre: string;
    cantidad: number;
    costo: number;
    subtotal: number;
}

interface PurchaseDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PurchaseDialog({ isOpen, onClose }: PurchaseDialogProps) {
    // Form States
    const [selectedProviderId, setSelectedProviderId] = useState<string>('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

    // Data States
    const [providers, setProviders] = useState<Provider[]>([]);
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Initial Load
    useEffect(() => {
        if (isOpen) {
            loadProviders();
        } else {
            // Reset form
            setSelectedProviderId('');
            setInvoiceNumber('');
            setItems([]);
            setSearchTerm('');
            setSearchResults([]);
        }
    }, [isOpen]);

    // Product Search effect
    useEffect(() => {
        const searchProducts = async () => {
            if (searchTerm.length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                // Determine if searching by SKU (number) or Name
                const productsRef = collection(db, 'products');
                let q;

                // Simple search logic - improves could be made with more complex indexing
                // For now fetching active products and filtering client-side for better UX on small datasets
                // Or standard firestore query limits

                // Firestore doesn't support native "includes" search, so we'll fetch a batch
                // In a real huge app, we'd use Algolia or similar. 
                // Here we'll rely on a simple query constraint if possible or prefix.

                // Let's try prefix search for name
                q = query(
                    productsRef,
                    where('activo', '==', true),
                    orderBy('nombre'),
                    // where('nombre', '>=', searchTerm.toUpperCase()),
                    // where('nombre', '<=', searchTerm.toUpperCase() + '\uf8ff')
                );

                const snapshot = await getDocs(q);
                const results: Product[] = [];
                const searchLower = searchTerm.toLowerCase();

                snapshot.forEach(doc => {
                    const data = doc.data() as Product;
                    if (data.nombre.toLowerCase().includes(searchLower) ||
                        data.codigo_barras?.includes(searchTerm)) {
                        results.push({ ...data, id: doc.id });
                    }
                });

                setSearchResults(results.slice(0, 10)); // Limit to 10
            } catch (error) {
                console.error("Error searching products:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchProducts, 400);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const loadProviders = async () => {
        const q = query(collection(db, 'providers'), orderBy('nombre'));
        const snapshot = await getDocs(q);
        setProviders(snapshot.docs.map(doc => ({
            id: doc.id,
            nombre: doc.data().nombre
        })));
    };

    const addItem = (product: Product) => {
        // Check if already exists
        if (items.find(i => i.productId === product.id)) {
            alert('Este producto ya está en la lista.');
            return;
        }

        const newItem: PurchaseItem = {
            productId: product.id,
            nombre: product.nombre,
            cantidad: 1,
            costo: product.precio_costo || 0,
            subtotal: product.precio_costo || 0
        };

        setItems([...items, newItem]);
        setSearchTerm(''); // Clear search to continue adding
        setSearchResults([]);
    };

    const updateItem = (index: number, field: keyof PurchaseItem, value: number) => {
        const newItems = [...items];
        const item = newItems[index];

        if (field === 'cantidad') item.cantidad = value;
        if (field === 'costo') item.costo = value;

        item.subtotal = item.cantidad * item.costo;
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + item.subtotal, 0);
    };

    const handleSaveOpenPurchase = async () => {
        if (!selectedProviderId) {
            alert('Por favor selecciona un proveedor.');
            return;
        }
        if (items.length === 0) {
            alert('Agrega al menos un producto a la compra.');
            return;
        }

        setIsProcessing(true);
        try {
            const batch = writeBatch(db);
            const total = calculateTotal();

            // 1. Create Purchase Reccord
            const purchaseRef = doc(collection(db, 'purchases'));
            batch.set(purchaseRef, {
                provider_id: selectedProviderId,
                numero_factura: invoiceNumber,
                fecha: Timestamp.fromDate(new Date(purchaseDate)),
                total: total,
                items: items,
                created_at: Timestamp.now()
            });

            // 2. Create Movement Record
            const movementRef = doc(collection(db, 'provider_movements'));
            batch.set(movementRef, {
                provider_id: selectedProviderId,
                tipo: 'compra',
                monto: total,
                referencia_id: purchaseRef.id,
                fecha: Timestamp.fromDate(new Date(purchaseDate)),
                created_at: Timestamp.now()
            });

            // 3. Update Provider Balance (Negative balance means we owe them money)
            // Strategy: Saldo = (Pagos - Compras). If I buy 1000, balance decreases by 1000.
            const providerRef = doc(db, 'providers', selectedProviderId);
            // We need to read the current balance first to be 100% safe, 
            // but `increment` is atomic. 
            // If saldo represents "How much I have", then debt is negative.
            // buy: saldo - total. pay: saldo + amount.
            // Let's stick to: Saldo actual. -1000 means I owe 1000.
            const { increment } = await import('firebase/firestore'); // dynamic import just in case
            batch.update(providerRef, {
                saldo: increment(-total),
                updated_at: Timestamp.now()
            });

            // 4. Update Product Stocks and Costs
            items.forEach(item => {
                const productRef = doc(db, 'products', item.productId);
                batch.update(productRef, {
                    stock_actual: increment(item.cantidad),
                    precio_costo: item.costo, // Update cost to last purchase price
                    updated_at: Timestamp.now()
                });
            });

            await batch.commit();
            alert('Compra registrada correctamente. Stock y saldos actualizados.');
            onClose();

        } catch (error) {
            console.error('Error saving purchase:', error);
            alert('Error al registrar la compra.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-0 bg-card border-border">
                <DialogHeader className="p-6 border-b border-gold/10 bg-muted/50">
                    <DialogTitle className="text-2xl font-bold text-gold flex items-center gap-2">
                        <ShoppingCart className="w-6 h-6" />
                        Registrar Factura de Compra
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Invoice Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="space-y-2">
                            <Label>Proveedor</Label>
                            <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                                <SelectTrigger className="bg-background border-border">
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {providers.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha</Label>
                            <Input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                className="bg-background border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nº Factura / Remito</Label>
                            <Input
                                placeholder="0001-00123456"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                className="bg-background border-border"
                            />
                        </div>
                    </div>

                    {/* Product Search */}
                    <div className="space-y-2 relative z-20">
                        <Label>Agregar Productos</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o código de barras..."
                                className="pl-10 bg-background border-border focus:border-gold/50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {/* Search Results Dropdown */}
                        {searchTerm.length >= 2 && (
                            <div className="absolute w-full mt-1 bg-card border border-gold/20 rounded-md shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                                {isSearching ? (
                                    <div className="p-4 text-center text-muted-foreground text-sm">Buscando...</div>
                                ) : searchResults.length === 0 ? (
                                    <div className="p-4 text-center text-muted-foreground text-sm">No se encontraron productos.</div>
                                ) : (
                                    <ul>
                                        {searchResults.map(prod => (
                                            <li
                                                key={prod.id}
                                                className="p-3 hover:bg-muted cursor-pointer flex justify-between items-center transition-colors border-b border-border last:border-0"
                                                onClick={() => addItem(prod)}
                                            >
                                                <div>
                                                    <p className="font-medium text-foreground">{prod.nombre}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        SKU: {prod.codigo_barras || 'N/A'} | Stock: {prod.stock_actual}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant="outline" className="border-gold/30 text-gold mb-1 block">
                                                        Costo: {formatCurrency(prod.precio_costo || 0)}
                                                    </Badge>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="bg-muted/10 border border-border rounded-lg overflow-hidden">
                        <div className="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-muted-foreground">Detalle de Productos</h4>
                            <span className="text-xs text-muted-foreground">{items.length} items</span>
                        </div>
                        {items.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center">
                                <AlertTriangle className="w-8 h-8 text-muted-foreground/40 mb-2" />
                                <p className="text-muted-foreground text-sm">Agrega productos usando el buscador.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-muted-foreground bg-muted/50 font-medium border-b border-border">
                                        <tr>
                                            <th className="p-3">Producto</th>
                                            <th className="p-3 w-24">Cantidad</th>
                                            <th className="p-3 w-32">Costo Un.</th>
                                            <th className="p-3 w-32 text-right">Subtotal</th>
                                            <th className="p-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {items.map((item, index) => (
                                            <tr key={item.productId} className="group hover:bg-muted/30">
                                                <td className="p-3 font-medium text-zinc-300">{item.nombre}</td>
                                                <td className="p-3">
                                                    <Input
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        value={item.cantidad}
                                                        onChange={(e) => updateItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                                                        className="h-8 bg-background border-border text-center"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.costo}
                                                            onChange={(e) => updateItem(index, 'costo', parseFloat(e.target.value) || 0)}
                                                            className="h-8 pl-5 bg-background border-border text-right"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right font-bold text-foreground">
                                                    {formatCurrency(item.subtotal)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => removeItem(index)}
                                                        className="text-muted-foreground/40 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-6 border-t border-gold/10 bg-muted/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-right sm:text-left w-full sm:w-auto">
                        <p className="text-muted-foreground text-xs uppercase tracking-wider">Total Factura</p>
                        <p className="text-3xl font-bold text-gold">{formatCurrency(calculateTotal())}</p>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="ghost" onClick={onClose} className="text-muted-foreground flex-1 sm:flex-none">
                            Cancelar
                        </Button>
                        <Button
                            variant="gold"
                            onClick={handleSaveOpenPurchase}
                            disabled={isProcessing || items.length === 0 || !selectedProviderId}
                            className="gap-2 flex-1 sm:flex-none"
                        >
                            {isProcessing ? 'Procesando...' : (
                                <>
                                    <Save className="w-4 h-4" /> Registrar Compra
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
