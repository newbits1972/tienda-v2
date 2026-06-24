'use client';

import React, { useState, useEffect } from 'react';
import {
    collection,
    writeBatch,
    query,
    getDocs,
    where,
    Timestamp
} from 'firebase/firestore';
import {
    TrendingUp,
    Percent,
    DollarSign,
    AlertTriangle,
    CheckCircle2,
    RotateCcw
} from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { useReactToPrint } from 'react-to-print';
import { PriceUpdateReport } from './PriceUpdateReport';
import { db } from '@/lib/firebase/config';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface PriceUpdateDialogProps {
    isOpen: boolean;
    onClose: () => void;
    categories: string[];
}

export function PriceUpdateDialog({ isOpen, onClose, categories }: PriceUpdateDialogProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [updateType, setUpdateType] = useState<'percent' | 'fixed' | 'usd_exchange'>('percent');
    const [amount, setAmount] = useState<string>('');
    const [dolarAnterior, setDolarAnterior] = useState<string>('');
    const [dolarNuevo, setDolarNuevo] = useState<string>('');
    const [rounding, setRounding] = useState<string>('none');
    const [updateCostPrice, setUpdateCostPrice] = useState(false);
    const [previewProducts, setPreviewProducts] = useState<{ id: string, nombre: string, original: number, nuevo: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const reportRef = React.useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: 'Reporte_Actualizacion_Precios',
    });

    // Resetear valores al cambiar el tipo de actualización
    useEffect(() => {
        setAmount('');
        setDolarAnterior('');
        setDolarNuevo('');
        setPreviewProducts([]);
    }, [updateType, isOpen]);

    // Calculate preview when options change
    useEffect(() => {
        if (!isOpen) return;

        const isAmountValid = amount && !isNaN(parseFloat(amount));
        const isUsdExchangeValid = updateType === 'usd_exchange' && 
            dolarAnterior && !isNaN(parseFloat(dolarAnterior)) && parseFloat(dolarAnterior) > 0 &&
            dolarNuevo && !isNaN(parseFloat(dolarNuevo));

        if (!isAmountValid && !isUsdExchangeValid) {
            setPreviewProducts([]);
            return;
        }

        const loadPreview = async () => {
            setLoading(true);
            try {
                const productsRef = collection(db, 'products');
                let q = query(productsRef, where('activo', '==', true));
                if (selectedCategory !== 'all') {
                    q = query(productsRef, where('categoria', '==', selectedCategory), where('activo', '==', true));
                }

                const snapshot = await getDocs(q);
                let value = 0;
                let actualUpdateType = updateType;

                if (updateType === 'usd_exchange') {
                    const ant = parseFloat(dolarAnterior);
                    const nvo = parseFloat(dolarNuevo);
                    value = ((nvo - ant) / ant) * 100;
                    actualUpdateType = 'percent';
                } else {
                    value = parseFloat(amount);
                }

                const preview = snapshot.docs.map(doc => {
                    const data = doc.data() as Product;
                    const original = data.precio_venta;
                    let nuevo = original;

                    if (actualUpdateType === 'percent') {
                        nuevo = original * (1 + (value / 100));
                    } else {
                        nuevo = original + value;
                    }

                    // Apply rounding
                    if (rounding === '10') nuevo = Math.round(nuevo / 10) * 10;
                    if (rounding === '50') nuevo = Math.round(nuevo / 50) * 50;
                    if (rounding === '100') nuevo = Math.round(nuevo / 100) * 100;

                    return {
                        id: doc.id,
                        nombre: data.nombre,
                        original,
                        nuevo
                    };
                });

                setPreviewProducts(preview.slice(0, 50)); // Only preview first 50
            } catch (err) {
                console.error("Error loading preview:", err);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(loadPreview, 500);
        return () => clearTimeout(timeoutId);
    }, [selectedCategory, updateType, amount, dolarAnterior, dolarNuevo, rounding, isOpen]);

    const handleApplyUpdate = async () => {
        const isAmountValid = amount && !isNaN(parseFloat(amount));
        const isUsdExchangeValid = updateType === 'usd_exchange' && 
            dolarAnterior && !isNaN(parseFloat(dolarAnterior)) && parseFloat(dolarAnterior) > 0 &&
            dolarNuevo && !isNaN(parseFloat(dolarNuevo));

        if (!isAmountValid && !isUsdExchangeValid) return;

        setIsProcessing(true);
        try {
            const productsRef = collection(db, 'products');
            let q = query(productsRef, where('activo', '==', true));
            if (selectedCategory !== 'all') {
                q = query(productsRef, where('categoria', '==', selectedCategory), where('activo', '==', true));
            }

            const snapshot = await getDocs(q);
            let value = 0;
            let actualUpdateType = updateType;

            if (updateType === 'usd_exchange') {
                const ant = parseFloat(dolarAnterior);
                const nvo = parseFloat(dolarNuevo);
                value = ((nvo - ant) / ant) * 100;
                actualUpdateType = 'percent';
            } else {
                value = parseFloat(amount);
            }
            const batch = writeBatch(db);

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data() as Product;
                const originalVenta = data.precio_venta;
                let nuevoVenta = originalVenta;

                if (actualUpdateType === 'percent') {
                    nuevoVenta = originalVenta * (1 + (value / 100));
                } else {
                    nuevoVenta = originalVenta + value;
                }

                // Apply rounding
                if (rounding === '10') nuevoVenta = Math.round(nuevoVenta / 10) * 10;
                if (rounding === '50') nuevoVenta = Math.round(nuevoVenta / 50) * 50;
                if (rounding === '100') nuevoVenta = Math.round(nuevoVenta / 100) * 100;

                const updates: any = {
                    precio_venta: nuevoVenta,
                    updated_at: Timestamp.now()
                };

                if (updateCostPrice) {
                    const originalCosto = data.precio_costo || 0;
                    let nuevoCosto = originalCosto;
                    if (actualUpdateType === 'percent') {
                        nuevoCosto = originalCosto * (1 + (value / 100));
                    } else {
                        nuevoCosto = originalCosto + value;
                    }
                    updates.precio_costo = nuevoCosto;
                }

                batch.update(docSnap.ref, updates);
            });

            await batch.commit();
            alert('¡Precios actualizados con éxito!');
            onClose();
        } catch (err) {
            console.error("Error applying updates:", err);
            alert('Error al actualizar precios.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[850px] h-[90vh] flex flex-col p-0 bg-card border-border">
                <DialogHeader className="p-6 border-b border-gold/10 bg-muted/50">
                    <DialogTitle className="text-2xl font-bold text-gold flex items-center gap-2">
                        <TrendingUp className="w-6 h-6" />
                        Actualización Masiva de Precios
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Categoría a Afectar</Label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="bg-background border-border">
                                        <SelectValue placeholder="Todas las categorías" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las categorías</SelectItem>
                                        {categories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo de Ajuste</Label>
                                <div className="flex gap-2 flex-wrap">
                                    <Button
                                        type="button"
                                        variant={updateType === 'percent' ? 'gold' : 'outline'}
                                        className="flex-1 gap-1 text-[11px] py-2"
                                        onClick={() => setUpdateType('percent')}
                                    >
                                        <Percent className="w-3.5 h-3.5" /> Porcentaje
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={updateType === 'fixed' ? 'gold' : 'outline'}
                                        className="flex-1 gap-1 text-[11px] py-2"
                                        onClick={() => setUpdateType('fixed')}
                                    >
                                        <DollarSign className="w-3.5 h-3.5" /> Monto Fijo
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={updateType === 'usd_exchange' ? 'gold' : 'outline'}
                                        className="flex-1 gap-1 text-[11px] py-2"
                                        onClick={() => setUpdateType('usd_exchange')}
                                    >
                                        <TrendingUp className="w-3.5 h-3.5" /> Ajuste Dólar
                                    </Button>
                                </div>
                            </div>

                            {updateType === 'usd_exchange' ? (
                                <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <Label>Dólar Anterior ($)</Label>
                                        <Input
                                            type="number"
                                            placeholder="Ej: 1200"
                                            value={dolarAnterior}
                                            onChange={(e) => setDolarAnterior(e.target.value)}
                                            className="bg-background border-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Dólar Nuevo ($)</Label>
                                        <Input
                                            type="number"
                                            placeholder="Ej: 1280"
                                            value={dolarNuevo}
                                            onChange={(e) => setDolarNuevo(e.target.value)}
                                            className="bg-background border-border"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label>{updateType === 'percent' ? 'Porcentaje de Ajuste (%)' : 'Monto de Ajuste ($)'}</Label>
                                    <Input
                                        type="number"
                                        placeholder={updateType === 'percent' ? "Ej: 15 o -5" : "Ej: 500 o -100"}
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="bg-background border-border"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Usa números negativos para descuentos.</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Redondeo</Label>
                                <Select value={rounding} onValueChange={setRounding}>
                                    <SelectTrigger className="bg-background border-border">
                                        <SelectValue placeholder="Sin redondeo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin redondeo</SelectItem>
                                        <SelectItem value="10">Al múltiplo de 10 más cercano</SelectItem>
                                        <SelectItem value="50">Al múltiplo de 50 más cercano</SelectItem>
                                        <SelectItem value="100">Al múltiplo de 100 más cercano</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                                <div className="space-y-0.5">
                                    <Label className="text-sm">Actualizar Costo</Label>
                                    <p className="text-xs text-muted-foreground">También ajusta el precio de costo.</p>
                                </div>
                                <Switch
                                    checked={updateCostPrice}
                                    onCheckedChange={setUpdateCostPrice}
                                />
                            </div>
                        </div>

                        <div className="bg-muted/30 border border-border rounded-lg flex flex-col overflow-hidden">
                            <div className="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-muted-foreground">Vista Previa</h4>
                                {loading && <RotateCcw className="w-3 h-3 animate-spin text-gold" />}
                            </div>
                            <div className="flex-1 overflow-y-auto p-0">
                                {previewProducts.length > 0 ? (
                                    <table className="w-full text-[10px]">
                                        <thead className="bg-muted text-muted-foreground sticky top-0">
                                            <tr>
                                                <th className="text-left p-2">Producto</th>
                                                <th className="text-right p-2">Actual</th>
                                                <th className="text-right p-2">Nuevo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {previewProducts.map(p => (
                                                <tr key={p.id}>
                                                    <td className="p-2 text-foreground truncate max-w-[120px]">{p.nombre}</td>
                                                    <td className="p-2 text-right text-muted-foreground line-through">{formatCurrency(p.original)}</td>
                                                    <td className="p-2 text-right text-gold font-bold">{formatCurrency(p.nuevo)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                                        <AlertTriangle className="w-8 h-8 text-muted-foreground/20 mb-2" />
                                        <p className="text-xs text-muted-foreground/60">
                                            {updateType === 'usd_exchange'
                                                ? 'Ingresa cotización anterior y nueva para calcular la variación.'
                                                : 'Ingresa un monto para ver la proyección de precios.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t border-gold/10 bg-muted/50 flex justify-between items-center">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-muted-foreground hover:text-gold border-border"
                        onClick={() => handlePrint()}
                        disabled={previewProducts.length === 0}
                    >
                        Imprimir Listado
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
                            Cancelar
                        </Button>
                        <Button
                            variant="gold"
                            onClick={handleApplyUpdate}
                            disabled={isProcessing || previewProducts.length === 0}
                            className="gap-2"
                        >
                            {isProcessing ? (
                                <>Actualizando...</>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Aplicar Cambios
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>

                {/* Hidden Component for Printing */}
                <div className="hidden">
                    <PriceUpdateReport
                        ref={reportRef}
                        category={selectedCategory}
                        updateType={updateType === 'usd_exchange' ? 'percent' : updateType}
                        amount={
                            updateType === 'usd_exchange'
                                ? (() => {
                                      const ant = parseFloat(dolarAnterior || '1');
                                      const nvo = parseFloat(dolarNuevo || '1');
                                      return (((nvo - ant) / ant) * 100).toFixed(2);
                                  })()
                                : amount
                        }
                        rounding={rounding}
                        products={previewProducts}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
