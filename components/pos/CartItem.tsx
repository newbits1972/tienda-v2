'use client';

import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { CartItem as CartItemType } from '@/lib/types';

interface CartItemProps {
    item: CartItemType;
    onRemove: (id: string) => void;
    onUpdateQuantity: (id: string, quantity: number) => void;
}

function CartItemComponent({ item, onRemove, onUpdateQuantity }: CartItemProps) {
    return (
        <div className="border rounded-lg p-3 space-y-2 hover:bg-accent/50 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h4 className="font-medium">{item.producto.nombre}</h4>

                    {/* Variants & Extras Display */}
                    <div className="text-xs text-muted-foreground space-y-0.5">
                        {item.selectedVariants && Object.values(item.selectedVariants).map((v, i) => (
                            <div key={i}>• {v.nombre} {v.precio_extra > 0 && `(+$${v.precio_extra})`}</div>
                        ))}
                        {item.selectedExtras && item.selectedExtras.map((e, i) => (
                            <div key={i}>+ {e.nombre} (+${e.precio})</div>
                        ))}
                        {item.notas && (
                            <div className="text-orange-400 italic">"{item.notas}"</div>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(item.producto.precio_venta)}
                        {item.producto.es_pesable && '/kg'}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(item.internalId || item.producto.id)} className="text-destructive hover:text-destructive h-8 w-8"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex items-center justify-between">
                {item.producto.es_pesable ? (
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                            {formatWeight(item.peso_gramos || 0)}
                        </Badge>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onUpdateQuantity(item.internalId || item.producto.id, item.cantidad - 1)} className="h-8 w-8"
                        >
                            <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-12 text-center font-medium">
                            {item.cantidad}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onUpdateQuantity(item.internalId || item.producto.id, item.cantidad + 1)} className="h-8 w-8"
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                )}

                <div className="text-right">
                    <p className="font-semibold text-gold">
                        {formatCurrency(item.subtotal)}
                    </p>
                </div>
            </div>
        </div>
    );
}

export const CartItem = React.memo(CartItemComponent);
