'use client';

import React from 'react';
import { Product } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface QuickAccessGridProps {
    products: Product[];
    onProductClick: (product: Product) => void;
    quickAccessIds?: string[];
}

export function QuickAccessGrid({ products, onProductClick, quickAccessIds }: QuickAccessGridProps) {
    // Filter products to show only those in quickAccessIds (limit to 10 as requested)
    const quickProducts = quickAccessIds
        ? products.filter(p => quickAccessIds.includes(p.id)).slice(0, 10)
        : products.slice(0, 10); // Fallback to first 10 if not configured

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3 h-full overflow-y-auto pr-2 scrollbar-hide">
            {quickProducts.map((product) => (
                <Card
                    key={product.id}
                    className="cursor-pointer hover:border-primary transition-all bg-card border-border flex flex-col group overflow-hidden active:scale-95"
                    onClick={() => onProductClick(product)}
                >
                    <div className="aspect-square w-full bg-muted relative overflow-hidden">
                        {product.imagen_url ? (
                            <img
                                src={product.imagen_url}
                                alt={product.nombre}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs">
                                Sin Imagen
                            </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-muted/90 backdrop-blur-sm p-2 border-t border-border/50">
                            <span className="text-foreground font-black text-[10px] sm:text-xs block truncate leading-tight">
                                {product.nombre}
                            </span>
                        </div>
                    </div>
                </Card>
            ))}

            {quickProducts.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
                    <p className="text-sm italic">Configurar productos de acceso rápido</p>
                </div>
            )}
        </div>
    );
}
