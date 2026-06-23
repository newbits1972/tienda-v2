'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product, ProductVariant } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { useTenant } from '@/hooks/useTenant';
import { cn } from '@/lib/utils';

interface VariantSelectorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSelect: (product: Product, variant: ProductVariant) => void;
}

/**
 * Selector de matriz talle×color para el POS.
 * - Muestra swatches de color (filtrado por color seleccionado)
 * - Muestra talles disponibles para ese color con stock
 * - Bloquea combinaciones sin stock
 */
export function VariantSelectorDialog({ isOpen, onClose, product, onSelect }: VariantSelectorDialogProps) {
    const { tenantId } = useTenant();
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedTalle, setSelectedTalle] = useState<string | null>(null);

    // Cargar variantes del producto
    useEffect(() => {
        if (!isOpen || !product || !tenantId) return;

        const q = query(
            collection(db, 'product_variants'),
            where('tenantId', '==', tenantId),
            where('producto_id', '==', product.id),
            where('activo', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as ProductVariant);
            setVariants(data);
            // Pre-seleccionar primer color si hay
            if (data.length > 0 && !selectedColor) {
                setSelectedColor(data[0].color);
            }
        });

        return () => unsubscribe();
    }, [isOpen, product, tenantId]);

    // Reset al cerrar
    useEffect(() => {
        if (!isOpen) {
            setSelectedColor(null);
            setSelectedTalle(null);
        }
    }, [isOpen]);

    if (!product) return null;

    // Colores únicos disponibles (con stock > 0 en alguna combinación)
    const colores = Array.from(new Set(variants.filter(v => v.stock_actual > 0).map(v => v.color)));
    // Talles disponibles para el color seleccionado
    const tallesParaColor = selectedColor
        ? variants.filter(v => v.color === selectedColor && v.stock_actual > 0)
        : [];

    const colorHex = (colorName: string) => {
        const v = variants.find(v => v.color === colorName);
        return v?.color_hex || '#cccccc';
    };

    const stockDeCombinacion = (color: string, talle: string) => {
        const v = variants.find(v => v.color === color && v.talle === talle);
        return v?.stock_actual || 0;
    };

    const handleConfirm = () => {
        if (!product || !selectedColor || !selectedTalle) return;
        const variant = variants.find(v => v.color === selectedColor && v.talle === selectedTalle);
        if (!variant) return;
        onSelect(product, variant);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{product.nombre}</DialogTitle>
                    <DialogDescription>
                        {product.marca && <span>{product.marca} · </span>}
                        Seleccioná color y talle
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Colores */}
                    <div>
                        <p className="text-sm font-medium mb-2">Color {selectedColor && <span className="text-muted-foreground">· {selectedColor}</span>}</p>
                        <div className="flex flex-wrap gap-2">
                            {colores.map(color => (
                                <button
                                    key={color}
                                    onClick={() => { setSelectedColor(color); setSelectedTalle(null); }}
                                    className={cn(
                                        "w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center",
                                        selectedColor === color
                                            ? "border-primary ring-2 ring-primary/30 scale-110"
                                            : "border-border hover:border-primary/50"
                                    )}
                                    style={{ backgroundColor: colorHex(color) }}
                                    title={color}
                                />
                            ))}
                            {colores.length === 0 && (
                                <p className="text-sm text-muted-foreground">Sin stock disponible</p>
                            )}
                        </div>
                    </div>

                    {/* Talles */}
                    {selectedColor && (
                        <div>
                            <p className="text-sm font-medium mb-2">Talle</p>
                            <div className="grid grid-cols-4 gap-2">
                                {tallesParaColor.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => setSelectedTalle(v.talle)}
                                        className={cn(
                                            "h-12 rounded-lg border-2 font-medium text-sm transition-all relative",
                                            selectedTalle === v.talle
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        {v.talle}
                                        {v.stock_actual <= 2 && v.stock_actual > 0 && (
                                            <span className="absolute -top-2 -right-2 text-[9px] bg-orange-500 text-white rounded-full px-1.5 py-0.5">
                                                ¡{v.stock_actual}!
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stock info */}
                    {selectedColor && selectedTalle && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                            <Badge variant="outline" className="mb-1">
                                Stock: {stockDeCombinacion(selectedColor, selectedTalle)} u.
                            </Badge>
                            <p className="text-muted-foreground text-xs mt-1">
                                SKU: {variants.find(v => v.color === selectedColor && v.talle === selectedTalle)?.sku}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedColor || !selectedTalle}
                    >
                        Agregar al carrito
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
