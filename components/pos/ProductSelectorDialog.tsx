'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Product, ProductVariant, VariantOption, ProductExtra } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, Minus, Calculator } from 'lucide-react';

interface ProductSelectorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onConfirm: (
        product: Product,
        quantity: number,
        variants: { [key: string]: VariantOption },
        extras: ProductExtra[],
        notes: string
    ) => void;
}

export function ProductSelectorDialog({ isOpen, onClose, product, onConfirm }: ProductSelectorDialogProps) {
    const [quantity, setQuantity] = useState(1);
    const [selectedVariants, setSelectedVariants] = useState<{ [key: string]: VariantOption }>({});
    const [selectedExtras, setSelectedExtras] = useState<ProductExtra[]>([]);
    const [notes, setNotes] = useState('');

    // Reset state when product changes
    useEffect(() => {
        if (product) {
            setQuantity(1);
            setSelectedVariants({});
            setSelectedExtras([]);
            setNotes('');

            // Auto-select first option for required variants (optional UX improvement)
            if (product.variantes) {
                const initialVariants: { [key: string]: VariantOption } = {};
                product.variantes.forEach(variantGroup => {
                    if (variantGroup.opciones.length > 0) {
                        // Default to first option
                        initialVariants[variantGroup.nombre] = variantGroup.opciones[0];
                    }
                });
                setSelectedVariants(initialVariants);
            }
        }
    }, [product, isOpen]);

    if (!product) return null;

    const handleVariantChange = (groupName: string, option: VariantOption) => {
        setSelectedVariants(prev => ({
            ...prev,
            [groupName]: option
        }));
    };

    const handleExtraToggle = (extra: ProductExtra) => {
        setSelectedExtras(prev => {
            const exists = prev.some(e => e.nombre === extra.nombre);
            if (exists) {
                return prev.filter(e => e.nombre !== extra.nombre);
            } else {
                return [...prev, extra];
            }
        });
    };

    // Calculate total price
    const calculateTotal = () => {
        let unitPrice = product.precio_venta;

        // Add variants
        Object.values(selectedVariants).forEach(v => {
            unitPrice += (v.precio_extra || 0);
        });

        // Add extras
        selectedExtras.forEach(e => {
            unitPrice += (e.precio || 0);
        });

        return unitPrice * quantity;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center text-xl">
                        <span>{product.nombre}</span>
                        <span className="text-primary">{formatCurrency(product.precio_venta)}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Variants Section */}
                    {product.variantes && product.variantes.length > 0 && (
                        <div className="space-y-4">
                            {product.variantes.map((variantGroup, idx) => (
                                <div key={idx} className="space-y-3">
                                    <Label className="text-base font-semibold text-muted-foreground">
                                        {variantGroup.nombre}
                                    </Label>
                                    <RadioGroup
                                        value={selectedVariants[variantGroup.nombre]?.nombre}
                                        onValueChange={(val) => {
                                            const option = variantGroup.opciones.find(o => o.nombre === val);
                                            if (option) handleVariantChange(variantGroup.nombre, option);
                                        }}
                                        className="grid grid-cols-2 gap-2"
                                    >
                                        {variantGroup.opciones.map((option, optIdx) => (
                                            <div key={optIdx}>
                                                <RadioGroupItem
                                                    value={option.nombre}
                                                    id={`v-${idx}-${optIdx}`}
                                                    className="peer sr-only"
                                                />
                                                <Label
                                                    htmlFor={`v-${idx}-${optIdx}`}
                                                    className="flex flex-col items-center justify-between rounded-md border-2 border-border bg-muted p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                                                >
                                                    <span className="font-semibold">{option.nombre}</span>
                                                    {option.precio_extra > 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            + {formatCurrency(option.precio_extra)}
                                                        </span>
                                                    )}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Extras Section */}
                    {product.extras && product.extras.length > 0 && (
                        <div className="space-y-3">
                            <Label className="text-base font-semibold text-muted-foreground">
                                Adicionales
                            </Label>
                            <div className="grid grid-cols-1 gap-2">
                                {product.extras.map((extra, idx) => {
                                    const isSelected = selectedExtras.some(e => e.nombre === extra.nombre);
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center justify-between p-3 rounded-md border transition-all cursor-pointer ${isSelected
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border bg-muted hover:bg-accent'
                                                }`}
                                            onClick={() => handleExtraToggle(extra)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Checkbox checked={isSelected} className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                                                <span className={isSelected ? 'text-primary font-medium' : 'text-muted-foreground'}>
                                                    {extra.nombre}
                                                </span>
                                            </div>
                                            {extra.precio > 0 && (
                                                <Badge variant="secondary" className="bg-muted">
                                                    + {formatCurrency(extra.precio)}
                                                </Badge>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-muted-foreground">Notas / Observaciones</Label>
                        <Textarea
                            id="notes"
                            placeholder="Ej: Envolver para regalo, sin etiqueta de precio..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="bg-muted border-border resize-none min-h-[80px]"
                        />
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
                        <span className="font-semibold text-muted-foreground">Cantidad</span>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="h-10 w-10 border-border hover:bg-accent"
                            >
                                <Minus className="w-4 h-4" />
                            </Button>
                            <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setQuantity(quantity + 1)}
                                className="h-10 w-10 border-border hover:bg-accent"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-border pt-4">
                    <Button
                        className="w-full bg-primary text-primary-foreground font-bold h-12 text-lg hover:bg-primary/90"
                        onClick={() => onConfirm(product, quantity, selectedVariants, selectedExtras, notes)}
                    >
                        Agregar por {formatCurrency(calculateTotal())}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
