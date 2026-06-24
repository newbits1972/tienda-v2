'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product, ProductVariant } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { useTenant } from '@/hooks/useTenant';
import { useBranch } from '@/contexts/BranchContext';
import { cn, formatCurrency } from '@/lib/utils';
import { Plus, Minus, ShoppingBag, Barcode, Tag, Shirt, Layers, Info } from 'lucide-react';

interface VariantSelectorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSelect: (product: Product, variant: ProductVariant, cantidad: number) => void;
}

/**
 * Selector de matriz talle×color premium para el POS.
 * - Muestra ficha técnica del producto a la izquierda.
 * - Visualización dinámica de imagen según el color seleccionado.
 * - Muestra swatches de color con efectos interactivos.
 * - Muestra talles y sus stock en tiempo real en la grilla.
 * - Selector de cantidad interactivo integrado.
 * - Consulta de stock cruzado en otras sucursales.
 * - Manejo robusto de variantes virtuales (evita que la caja se trabe).
 */
export function VariantSelectorDialog({ isOpen, onClose, product, onSelect }: VariantSelectorDialogProps) {
    const { tenantId } = useTenant();
    const { branches } = useBranch();
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedTalle, setSelectedTalle] = useState<string | null>(null);
    const [cantidad, setCantidad] = useState<number>(1);

    // Cargar variantes del producto en tiempo real
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
            
            // Pre-seleccionar primer color si existe
            if (data.length > 0 && !selectedColor) {
                setSelectedColor(data[0].color);
            }
        });

        return () => unsubscribe();
    }, [isOpen, product, tenantId]);

    // Reset al cerrar o cambiar de producto
    useEffect(() => {
        if (!isOpen) {
            setSelectedColor(null);
            setSelectedTalle(null);
            setCantidad(1);
        }
    }, [isOpen]);

    if (!product) return null;

    // Si la colección de variantes física está vacía, hacemos un fallback virtual
    const usaFallbackVirtual = variants.length === 0;

    // Obtener todos los colores del producto (físicos o virtuales) sin ocultar los que tengan stock 0
    const colores = usaFallbackVirtual
        ? (product.colores_disponibles || []).map(c => c.nombre)
        : Array.from(new Set(variants.map(v => v.color)));

    // Obtener los talles disponibles para el color seleccionado
    const tallesParaColor = usaFallbackVirtual
        ? (product.talles_disponibles || []).map(talle => ({
              id: `virtual-${selectedColor}-${talle}-${product.id}`,
              talle,
              color: selectedColor || '',
              stock_actual: 99, // Stock virtual alto para permitir venta libre
          }))
        : (selectedColor
              ? variants.filter(v => v.color === selectedColor)
              : []);

    // Buscar si existe una variante de este color con una imagen específica para actualizar la vista previa
    const varianteConImagen = selectedColor ? variants.find(v => v.color === selectedColor && v.imagen_url) : null;
    const imagenAMostrar = varianteConImagen?.imagen_url || product.imagen_url;

    const colorHex = (colorName: string) => {
        if (usaFallbackVirtual) {
            const cOpt = (product.colores_disponibles || []).find(c => c.nombre === colorName);
            return cOpt?.hex || '#cccccc';
        }
        const v = variants.find(v => v.color === colorName);
        return v?.color_hex || '#cccccc';
    };

    const selectedVariant = variants.find(v => v.color === selectedColor && v.talle === selectedTalle);

    // Cálculos de Precios
    const tieneOferta = !!product.precio_oferta;
    const precioOriginal = selectedVariant?.precio_venta ?? product.precio_venta;
    const precioFinal = product.precio_oferta ?? precioOriginal;
    const descuentoPorcentaje = tieneOferta ? Math.round(((precioOriginal - precioFinal) / precioOriginal) * 100) : 0;
    const totalAcumulado = precioFinal * cantidad;

    const handleConfirm = () => {
        if (!product || !selectedColor || !selectedTalle) return;
        let variant = variants.find(v => v.color === selectedColor && v.talle === selectedTalle);

        // Si la variante no existe en Firestore (fallback o inconsistencia), la generamos al vuelo
        if (!variant) {
            variant = {
                id: `virtual-${selectedColor}-${selectedTalle}-${product.id}`,
                tenantId: tenantId || 'default_store',
                producto_id: product.id,
                producto_nombre: product.nombre,
                talle: selectedTalle,
                color: selectedColor,
                color_hex: colorHex(selectedColor),
                sku: `${product.nombre.slice(0, 3).toUpperCase()}-${selectedColor.slice(0, 3).toUpperCase()}-${selectedTalle}`,
                codigo_barras: product.codigo_barras || '',
                stock_actual: 99,
                stock_minimo: 0,
                activo: true,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
            } as any;
        }

        if (!variant) return;
        onSelect(product, variant, cantidad);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden bg-card border border-border rounded-3xl shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-12">
                    
                    {/* COLUMNA IZQUIERDA: Imagen y Ficha Técnica del Producto */}
                    <div className="md:col-span-5 bg-muted/20 border-r border-border/40 p-6 flex flex-col justify-between h-full min-h-[400px]">
                        <div className="space-y-5">
                            {/* Imagen del Producto */}
                            <div className="aspect-square w-full rounded-2xl bg-muted/40 relative overflow-hidden flex items-center justify-center border border-border/50 shadow-inner group">
                                {imagenAMostrar ? (
                                    <img
                                        src={imagenAMostrar}
                                        alt={product.nombre}
                                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30 p-4">
                                        <Shirt className="w-16 h-16 mb-2 stroke-[1.2]" />
                                        <span className="text-[10px] uppercase tracking-wider font-bold">Sin Imagen</span>
                                    </div>
                                )}
                                
                                {/* Badges flotantes */}
                                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                                    {product.marca && (
                                        <Badge className="bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-wider py-1 px-2.5 shadow-md">
                                            {product.marca}
                                        </Badge>
                                    )}
                                    {tieneOferta && (
                                        <Badge className="bg-green-500 text-white font-black text-[9px] uppercase tracking-wider py-1 px-2.5 shadow-md border-none">
                                            -{descuentoPorcentaje}% Off
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Títulos */}
                            <div>
                                <span className="text-[10px] text-primary uppercase font-black tracking-wider block mb-1">
                                    {product.categoria}
                                </span>
                                <h3 className="text-xl font-bold text-foreground leading-snug line-clamp-2">
                                    {product.nombre}
                                </h3>
                                {product.descripcion_corta && (
                                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                        {product.descripcion_corta}
                                    </p>
                                )}
                            </div>

                            {/* Ficha Técnica */}
                            <div className="space-y-2 border-t border-border/50 pt-4">
                                <span className="text-[10px] uppercase font-black text-muted-foreground/80 tracking-widest block mb-2">Especificaciones</span>
                                
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {product.material && (
                                        <div className="flex items-center gap-2 p-2 rounded-xl bg-background/50 border border-border/20">
                                            <Layers className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                                            <div className="truncate">
                                                <span className="text-[9px] text-muted-foreground/60 block leading-none">Material</span>
                                                <span className="font-semibold text-foreground truncate block">{product.material}</span>
                                            </div>
                                        </div>
                                    )}
                                    {product.genero && (
                                        <div className="flex items-center gap-2 p-2 rounded-xl bg-background/50 border border-border/20">
                                            <Shirt className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                                            <div>
                                                <span className="text-[9px] text-muted-foreground/60 block leading-none">Género</span>
                                                <span className="font-semibold text-foreground capitalize block">{product.genero}</span>
                                            </div>
                                        </div>
                                    )}
                                    {product.temporada && (
                                        <div className="flex items-center gap-2 p-2 rounded-xl bg-background/50 border border-border/20">
                                            <Tag className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                                            <div className="truncate">
                                                <span className="text-[9px] text-muted-foreground/60 block leading-none">Temporada</span>
                                                <span className="font-semibold text-foreground truncate block">{product.temporada}</span>
                                            </div>
                                        </div>
                                    )}
                                    {product.codigo_barras && (
                                        <div className="flex items-center gap-2 p-2 rounded-xl bg-background/50 border border-border/20 col-span-2">
                                            <Barcode className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                                            <div>
                                                <span className="text-[9px] text-muted-foreground/60 block leading-none">Cód. Barras Padre</span>
                                                <span className="font-mono font-semibold text-foreground block">{product.codigo_barras}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: Opciones de compra (Color, Talle, Cantidad, Stock) */}
                    <div className="md:col-span-7 p-6 flex flex-col justify-between space-y-6">
                        <div>
                            {/* Cabecera del modal (Mobile compatible) */}
                            <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
                                <div>
                                    <h4 className="font-bold text-base text-foreground">Opciones del Producto</h4>
                                    <p className="text-xs text-muted-foreground">Elegí la combinación para facturar</p>
                                </div>
                                <div className="text-right">
                                    {tieneOferta ? (
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-muted-foreground line-through">
                                                {formatCurrency(precioOriginal)}
                                            </span>
                                            <span className="text-xl font-black text-green-500">
                                                {formatCurrency(precioFinal)}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xl font-black text-foreground">
                                            {formatCurrency(precioFinal)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* SELECCIÓN DE COLOR */}
                                <div>
                                    <p className="text-xs uppercase font-black text-muted-foreground/80 tracking-widest mb-2.5">
                                        Color {selectedColor && <span className="text-primary font-bold">· {selectedColor}</span>}
                                    </p>
                                    <div className="flex flex-wrap gap-2.5">
                                        {colores.map(color => {
                                            const hex = colorHex(color);
                                            const active = selectedColor === color;
                                            return (
                                                <button
                                                    key={color}
                                                    onClick={() => { setSelectedColor(color); setSelectedTalle(null); }}
                                                    className={cn(
                                                        "h-9 px-3.5 rounded-full border text-xs font-semibold flex items-center gap-2 transition-all duration-200",
                                                        active
                                                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 scale-105 shadow-md"
                                                            : "border-border hover:border-primary/40 bg-background text-muted-foreground hover:text-foreground"
                                                    )}
                                                    title={color}
                                                >
                                                    <span 
                                                        className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block flex-shrink-0" 
                                                        style={{ backgroundColor: hex }}
                                                    />
                                                    {color}
                                                </button>
                                            );
                                        })}
                                        {colores.length === 0 && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
                                                <Info className="w-3.5 h-3.5 text-amber-500" />
                                                No hay colores definidos para este producto.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* SELECCIÓN DE TALLE */}
                                {selectedColor ? (
                                    <div>
                                        <p className="text-xs uppercase font-black text-muted-foreground/80 tracking-widest mb-2.5">Talle Disponible</p>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                            {tallesParaColor.map(v => {
                                                const sinStock = v.stock_actual <= 0;
                                                const active = selectedTalle === v.talle;
                                                return (
                                                    <button
                                                        key={v.id}
                                                        onClick={() => setSelectedTalle(v.talle)}
                                                        className={cn(
                                                            "h-12 rounded-xl border font-medium text-xs transition-all duration-200 flex flex-col items-center justify-center relative",
                                                            active
                                                                ? "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/20 scale-[1.02]"
                                                                : sinStock
                                                                    ? "border-border/40 bg-muted/10 text-muted-foreground/50 opacity-70 hover:border-primary/30"
                                                                    : "border-border hover:border-primary/50 bg-background"
                                                        )}
                                                    >
                                                        <span className="text-sm font-bold">{v.talle}</span>
                                                        <span className={cn(
                                                            "text-[8px] font-black tracking-wider uppercase mt-0.5",
                                                            sinStock 
                                                                ? "text-red-500" 
                                                                : v.stock_actual <= 2 
                                                                    ? "text-orange-500 animate-pulse" 
                                                                    : "text-muted-foreground/60"
                                                        )}>
                                                            {sinStock ? 'Sin stock' : `${v.stock_actual} u.`}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-6 border border-dashed border-border/55 rounded-2xl text-center text-xs text-muted-foreground bg-muted/5">
                                        Selecciona un color para ver los talles disponibles.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SELECTOR DE CANTIDAD, STOCK CRUZADO Y BOTÓN CONFIRMAR */}
                        <div className="space-y-4 pt-4 border-t border-border/50">
                            
                            {/* Stock Info por Sucursal (Stock Cruzado) */}
                            {selectedColor && selectedTalle && selectedVariant && (
                                <div className="bg-muted/30 rounded-2xl p-3.5 border border-border/40 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] uppercase font-black text-muted-foreground/80 tracking-widest">Distribución de Stock</span>
                                        <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-bold text-[10px]">
                                            Total Red: {selectedVariant.stock_actual} u.
                                        </Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                        {branches.filter(b => b.activa).map((branch) => {
                                            const branchStock = selectedVariant.stock_by_branch?.[branch.id] || 0;
                                            const sinStockSucursal = branchStock <= 0;
                                            return (
                                                <div key={branch.id} className="flex justify-between items-center p-2 rounded-xl bg-background/70 border border-border/20">
                                                    <span className="font-semibold text-foreground truncate max-w-[70%]">{branch.nombre}</span>
                                                    {branchStock > 0 ? (
                                                        <Badge className={cn(
                                                            "font-black text-[9px] border-none shadow-sm",
                                                            branchStock <= 2 ? "bg-amber-500/10 text-amber-600" : "bg-green-500/10 text-green-600"
                                                        )}>
                                                            {branchStock} u.
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground/35 font-medium">Sin stock</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {branches.filter(b => b.activa).length === 0 && (
                                            <p className="text-[10px] text-muted-foreground text-center py-1 col-span-2">
                                                No hay sucursales activas registradas.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Footer de Selección: Cantidad y Botón Añadir */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                
                                {/* Control de Cantidad */}
                                <div className="flex items-center justify-between border border-border rounded-xl px-2.5 py-1.5 bg-background sm:w-36 flex-shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setCantidad(prev => Math.max(1, prev - 1))}
                                        className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground"
                                        disabled={cantidad <= 1}
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </Button>
                                    
                                    <input
                                        type="number"
                                        min="1"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-12 text-center font-bold text-sm bg-transparent border-none outline-none ring-0 focus:ring-0 focus:border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setCantidad(prev => prev + 1)}
                                        className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                </div>

                                {/* Botón Confirmar */}
                                <Button
                                    onClick={handleConfirm}
                                    disabled={!selectedColor || !selectedTalle}
                                    className="flex-1 h-11 text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 rounded-xl"
                                >
                                    <ShoppingBag className="w-4 h-4" />
                                    Agregar {cantidad > 1 && `(${cantidad} u.)`} · {formatCurrency(totalAcumulado)}
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
