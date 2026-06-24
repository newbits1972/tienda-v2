'use client';

import React from 'react';
import { Product } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Archive } from 'lucide-react';

interface QuickAccessGridProps {
    products: Product[];
    onProductClick: (product: Product) => void;
    quickAccessIds?: string[];
}

export function QuickAccessGrid({ products, onProductClick, quickAccessIds }: QuickAccessGridProps) {
    // Si hay IDs rápidos configurados, filtramos por ellos. Si no, mostramos los productos (máximo 40 para rendimiento).
    const displayProducts = quickAccessIds
        ? products.filter(p => quickAccessIds.includes(p.id))
        : products.slice(0, 40);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 h-full overflow-y-auto pr-2 scrollbar-hide py-2">
            {displayProducts.map((product) => {
                const tieneOferta = !!product.precio_oferta;
                
                // Lógica de visualización de stock
                const stock = product.stock_actual ?? 0;
                const controlaStock = product.stock_controlado;
                const stockBajo = controlaStock && stock <= product.stock_minimo;
                const sinStock = controlaStock && stock <= 0;

                return (
                    <Card
                        key={product.id}
                        className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card border-border flex flex-col group overflow-hidden active:scale-[0.98] rounded-2xl h-full flex-grow relative"
                        onClick={() => onProductClick(product)}
                    >
                        {/* Badges superiores flotantes */}
                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 max-w-[85%]">
                            {product.marca && (
                                <Badge className="bg-primary text-primary-foreground font-black text-[8px] uppercase tracking-wider py-0.5 px-1.5 shadow-md truncate">
                                    {product.marca}
                                </Badge>
                            )}
                            {tieneOferta && (
                                <Badge className="bg-green-500 text-white font-bold text-[8px] uppercase py-0.5 px-1.5 shadow-md">
                                    ¡Oferta!
                                </Badge>
                            )}
                        </div>

                        {/* Badge de Stock en esquina superior derecha */}
                        <div className="absolute top-2 right-2 z-10">
                            {controlaStock ? (
                                sinStock ? (
                                    <Badge variant="destructive" className="text-[8px] py-0.5 px-1.5 font-bold shadow-md">
                                        Sin Stock
                                    </Badge>
                                ) : (
                                    <Badge 
                                        className={cn(
                                            "text-[8px] py-0.5 px-1.5 font-bold shadow-md",
                                            stockBajo ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-zinc-850 text-zinc-300 hover:bg-zinc-750"
                                        )}
                                    >
                                        Stock: {stock}
                                    </Badge>
                                )
                            ) : (
                                <Badge className="bg-zinc-800/80 text-zinc-400 text-[8px] py-0.5 px-1.5 font-bold border border-zinc-700/50">
                                    Libre
                                </Badge>
                            )}
                        </div>

                        {/* Imagen del Producto */}
                        <div className="aspect-square w-full bg-muted/30 relative overflow-hidden flex items-center justify-center border-b border-border/40">
                            {product.imagen_url ? (
                                <img
                                    src={product.imagen_url}
                                    alt={product.nombre}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted flex flex-col items-center justify-center text-muted-foreground/35 p-4 text-center">
                                    <Archive className="w-8 h-8 mb-1 opacity-20" />
                                    <span className="text-[9px] uppercase tracking-wider font-bold">Sin Imagen</span>
                                </div>
                            )}
                        </div>

                        {/* Información del Producto */}
                        <CardContent className="p-3 flex-1 flex flex-col justify-between gap-2 bg-muted/5">
                            <div>
                                <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block mb-0.5">
                                    {product.categoria}
                                </span>
                                <h4 className="text-foreground font-bold text-xs sm:text-sm line-clamp-2 leading-tight min-h-[2.5em] group-hover:text-primary transition-colors">
                                    {product.nombre}
                                </h4>
                            </div>

                            {/* Precios */}
                            <div className="flex items-baseline justify-between mt-auto">
                                <div className="flex flex-col">
                                    {tieneOferta ? (
                                        <>
                                            <span className="text-[10px] text-muted-foreground line-through opacity-70">
                                                {formatCurrency(product.precio_venta)}
                                            </span>
                                            <span className="text-sm sm:text-base font-black text-green-500 leading-none">
                                                {formatCurrency(product.precio_oferta!)}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-sm sm:text-base font-black text-gold leading-none">
                                            {formatCurrency(product.precio_venta)}
                                        </span>
                                    )}
                                </div>
                                
                                {product.es_destacado && (
                                    <Sparkles className="w-3.5 h-3.5 text-gold fill-gold animate-pulse flex-shrink-0" />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}

            {displayProducts.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-3xl text-muted-foreground bg-muted/5">
                    <Archive className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm font-medium">No se encontraron productos disponibles</p>
                    <p className="text-xs text-muted-foreground/75">Prueba buscando otra palabra clave o agrega productos nuevos.</p>
                </div>
            )}
        </div>
    );
}
