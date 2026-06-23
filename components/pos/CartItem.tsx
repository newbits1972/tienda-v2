'use client';

import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { CartItem as CartItemType } from '@/lib/types';

interface CartItemProps {
    item: CartItemType;
    onRemove: (id: string) => void;
    onUpdateQuantity: (id: string, quantity: number) => void;
}

function CartItemComponent({ item, onRemove, onUpdateQuantity }: CartItemProps) {
    const itemId = item.internalId || item.producto.id;
    const unitPrice = item.variante?.precio_venta ?? item.producto.precio_venta;

    return (
        <div className="border rounded-lg p-3 space-y-2 hover:bg-accent/50 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h4 className="font-medium">{item.producto.nombre}</h4>

                    {/* Variante (talle × color) */}
                    {item.variante && (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                            <div className="flex items-center gap-2">
                                {item.variante.color_hex && (
                                    <span
                                        className="inline-block w-3 h-3 rounded-full border border-border"
                                        style={{ backgroundColor: item.variante.color_hex }}
                                    />
                                )}
                                <span>{item.variante.color} · Talle {item.variante.talle}</span>
                            </div>
                            {item.variante.sku && (
                                <div className="font-mono text-[10px] opacity-70">SKU: {item.variante.sku}</div>
                            )}
                        </div>
                    )}

                    <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(unitPrice)} c/u
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(itemId)}
                    className="text-destructive hover:text-destructive h-8 w-8"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onUpdateQuantity(itemId, item.cantidad - 1)}
                        className="h-8 w-8"
                    >
                        <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-12 text-center font-medium">
                        {item.cantidad}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onUpdateQuantity(itemId, item.cantidad + 1)}
                        className="h-8 w-8"
                    >
                        <Plus className="w-3 h-3" />
                    </Button>
                </div>

                <div className="text-right">
                    <p className="font-semibold text-primary">
                        {formatCurrency(item.subtotal)}
                    </p>
                </div>
            </div>
        </div>
    );
}

export const CartItem = React.memo(CartItemComponent);
