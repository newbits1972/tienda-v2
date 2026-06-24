'use client';

import React from 'react';
import { Trash2, Plus, Minus, ShoppingCart as ShoppingCartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils';
import { CartItem } from './CartItem';

function ShoppingCartComponent() {
    const { items, removeItem, updateQuantity, getTotal, clearCart } = useCart();

    if (items.length === 0) {
        return (
            <Card className="h-full border-border bg-card shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCartIcon className="w-5 h-5 text-primary" />
                        Carrito de Compras
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <ShoppingCartIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>El carrito está vacío</p>
                        <p className="text-sm">Escanea productos para comenzar</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col border-border bg-card shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                    <ShoppingCartIcon className="w-5 h-5 text-primary" />
                    Carrito ({items.length})
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-destructive hover:text-destructive"
                >
                    Limpiar
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2">
                {items.map((item) => (
                    <CartItem key={item.internalId || item.producto.id} item={item} onRemove={removeItem} onUpdateQuantity={updateQuantity} />
                ))}
            </CardContent>
        </Card>
    );
}

export const ShoppingCart = React.memo(ShoppingCartComponent);
