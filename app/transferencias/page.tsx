'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ArrowLeftRight, Plus, Send, Check, X, Search } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { Transfer, ProductVariant, TransferStatus } from '@/lib/types';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { transferVariantStock } from '@/lib/inventory/variantService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const STATUS_LABEL: Record<TransferStatus, string> = {
    pendiente: 'Pendiente',
    en_transito: 'En Tránsito',
    recibida: 'Recibida',
    cancelada: 'Cancelada',
};

const STATUS_COLOR: Record<TransferStatus, string> = {
    pendiente: 'border-orange-500/30 text-orange-500 bg-orange-500/10',
    en_transito: 'border-blue-500/30 text-blue-500 bg-blue-500/10',
    recibida: 'border-green-500/30 text-green-500 bg-green-500/10',
    cancelada: 'border-destructive/30 text-destructive bg-destructive/10',
};

export default function TransferenciasPage() {
    const { tenantId } = useTenant();
    const { user } = useAuth();
    const { branches, activeBranch } = useBranch();
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newTransfer, setNewTransfer] = useState<{
        branch_destino: string;
        items: { variante_id: string; producto_nombre: string; talle: string; color: string; cantidad: number }[];
    }>({ branch_destino: '', items: [] });
    const [searchVariant, setSearchVariant] = useState('');
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [searchResults, setSearchResults] = useState<ProductVariant[]>([]);

    useEffect(() => {
        if (!tenantId) return;
        const q = query(collection(db, 'transfers'), where('tenantId', '==', tenantId));
        const unsubscribe = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id }) as Transfer);
            setTransfers(data.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0)));
        });
        return () => unsubscribe();
    }, [tenantId]);

    // Cargar variantes para búsqueda
    useEffect(() => {
        if (!tenantId) return;
        const q = query(
            collection(db, 'product_variants'),
            where('tenantId', '==', tenantId),
            where('activo', '==', true)
        );
        const unsubscribe = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id }) as ProductVariant);
            setVariants(data);
        });
        return () => unsubscribe();
    }, [tenantId]);

    useEffect(() => {
        if (searchVariant.length < 2) {
            setSearchResults([]);
            return;
        }
        const term = searchVariant.toLowerCase();
        const results = variants.filter(v =>
            (v.producto_nombre || '').toLowerCase().includes(term) ||
            v.sku?.toLowerCase().includes(term) ||
            v.codigo_barras?.includes(term) ||
            v.color?.toLowerCase().includes(term)
        ).slice(0, 8);
        setSearchResults(results);
    }, [searchVariant, variants]);

    const addItemToTransfer = (variant: ProductVariant) => {
        setNewTransfer(prev => ({
            ...prev,
            items: [...prev.items, {
                variante_id: variant.id,
                producto_nombre: variant.producto_nombre || 'Producto',
                talle: variant.talle,
                color: variant.color,
                cantidad: 1,
            }]
        }));
        setSearchVariant('');
        setSearchResults([]);
    };

    const updateItemQty = (index: number, cantidad: number) => {
        setNewTransfer(prev => ({
            ...prev,
            items: prev.items.map((item, i) => i === index ? { ...item, cantidad } : item)
        }));
    };

    const removeItem = (index: number) => {
        setNewTransfer(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const handleCreate = async () => {
        if (!activeBranch || !newTransfer.branch_destino || newTransfer.items.length === 0) {
            toast.error('Completa origen, destino y al menos un ítem');
            return;
        }
        if (activeBranch.id === newTransfer.branch_destino) {
            toast.error('La sucursal origen y destino deben ser distintas');
            return;
        }

        try {
            const transferRef = await addDoc(collection(db, 'transfers'), {
                tenantId,
                branch_origen: activeBranch.id,
                branch_destino: newTransfer.branch_destino,
                items: newTransfer.items,
                estado: 'pendiente',
                usuario_origen_id: user?.id || 'unknown',
                fecha: Timestamp.now(),
            });

            toast.success('Transferencia creada (pendiente)');
            setNewTransfer({ branch_destino: '', items: [] });
            setIsDialogOpen(false);
        } catch (e: any) {
            toast.error('Error: ' + e.message);
        }
    };

    const handleEnvio = async (transfer: Transfer) => {
        // Marcar en tránsito y descontar stock del origen
        try {
            // Descuenta stock en origen (transaccional)
            for (const item of transfer.items) {
                await transferVariantStock(
                    tenantId!,
                    item.variante_id,
                    transfer.branch_origen,
                    transfer.branch_destino,
                    item.cantidad,
                    user?.id || 'unknown',
                    transfer.id
                );
            }
            await updateDoc(doc(db, 'transfers', transfer.id), {
                estado: 'en_transito',
                fecha_envio: Timestamp.now(),
            });
            toast.success('Transferencia enviada, stock descontado');
        } catch (e: any) {
            toast.error('Error al enviar: ' + e.message);
        }
    };

    const handleRecepcion = async (transfer: Transfer) => {
        try {
            await updateDoc(doc(db, 'transfers', transfer.id), {
                estado: 'recibida',
                fecha_recepcion: Timestamp.now(),
                usuario_destino_id: user?.id,
            });
            toast.success('Recepción confirmada');
        } catch (e: any) {
            toast.error('Error: ' + e.message);
        }
    };

    const handleCancel = async (transfer: Transfer) => {
        if (!confirm('¿Cancelar esta transferencia?')) return;
        await updateDoc(doc(db, 'transfers', transfer.id), { estado: 'cancelada' });
    };

    const branchNombre = (id: string) => branches.find(b => b.id === id)?.nombre || 'N/A';

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ArrowLeftRight className="w-6 h-6 text-primary" />
                            Transferencias
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Mové mercadería entre sucursales · Sucursal activa: <span className="font-medium text-primary">{activeBranch?.nombre || 'Ninguna'}</span>
                        </p>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)} disabled={!activeBranch}>
                        <Plus className="w-4 h-4 mr-2" /> Nueva Transferencia
                    </Button>
                </div>

                {transfers.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="py-12 text-center">
                            <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-muted-foreground">No hay transferencias registradas.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {transfers.map(t => (
                            <Card key={t.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="text-sm">
                                                <div className="font-medium">{branchNombre(t.branch_origen)} → {branchNombre(t.branch_destino)}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {t.items.length} ítem(s) · {new Date(t.fecha?.seconds * 1000).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={STATUS_COLOR[t.estado]}>
                                                {STATUS_LABEL[t.estado]}
                                            </Badge>
                                            {t.estado === 'pendiente' && (
                                                <Button size="sm" onClick={() => handleEnvio(t)}>
                                                    <Send className="w-3 h-3 mr-1" /> Enviar
                                                </Button>
                                            )}
                                            {t.estado === 'en_transito' && (
                                                <Button size="sm" variant="outline" onClick={() => handleRecepcion(t)}>
                                                    <Check className="w-3 h-3 mr-1" /> Recibir
                                                </Button>
                                            )}
                                            {(t.estado === 'pendiente') && (
                                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleCancel(t)}>
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t text-xs space-y-1">
                                        {t.items.map((item, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span>{item.producto_nombre} · {item.talle} · {item.color}</span>
                                                <span className="font-medium">{item.cantidad} un.</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Dialog nueva transferencia */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Nueva Transferencia</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-muted/50 p-3 rounded-lg text-sm">
                            <span className="text-muted-foreground">Desde: </span>
                            <span className="font-medium">{activeBranch?.nombre}</span>
                        </div>
                        <div>
                            <Label>Sucursal destino *</Label>
                            <Select value={newTransfer.branch_destino} onValueChange={v => setNewTransfer({ ...newTransfer, branch_destino: v })}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>
                                    {branches.filter(b => b.id !== activeBranch?.id).map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Buscar producto a transferir</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="Nombre, SKU o código..."
                                    value={searchVariant}
                                    onChange={e => setSearchVariant(e.target.value)}
                                />
                            </div>
                            {searchResults.length > 0 && (
                                <div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
                                    {searchResults.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => addItemToTransfer(v)}
                                            className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0 text-sm"
                                        >
                                            <span className="font-medium">{v.producto_nombre}</span> · {v.talle} · {v.color}
                                            <Badge variant="outline" className="ml-2 text-xs">{v.stock_actual} en stock</Badge>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {newTransfer.items.length > 0 && (
                            <div className="border rounded-lg divide-y">
                                {newTransfer.items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2">
                                        <div className="flex-1 text-sm">
                                            <div className="font-medium">{item.producto_nombre}</div>
                                            <div className="text-xs text-muted-foreground">{item.talle} · {item.color}</div>
                                        </div>
                                        <Input
                                            type="number"
                                            min="1"
                                            className="w-20 h-8"
                                            value={item.cantidad}
                                            onChange={e => updateItemQty(i, parseInt(e.target.value) || 1)}
                                        />
                                        <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => removeItem(i)}>
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreate} disabled={newTransfer.items.length === 0 || !newTransfer.branch_destino}>
                            Crear Transferencia
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
