'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Product, VariantOption, ProductExtra } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
    Plus,
    Minus,
    X,
    Clock,
    Scale,
    Leaf,
    Info,
    ChevronDown,
    ChevronUp,
    Timer
} from 'lucide-react';

interface ShopProductSelectorProps {
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

export function ShopProductSelector({ isOpen, onClose, product, onConfirm }: ShopProductSelectorProps) {
    const [quantity, setQuantity] = useState(1);
    const [selectedVariants, setSelectedVariants] = useState<{ [key: string]: VariantOption }>({});
    const [selectedExtras, setSelectedExtras] = useState<ProductExtra[]>([]);
    const [notes, setNotes] = useState('');
    const [showFullInfo, setShowFullInfo] = useState(false);

    useEffect(() => {
        if (product && isOpen) {
            setQuantity(1);
            setSelectedVariants({});
            setSelectedExtras([]);
            setNotes('');

            if (product.variantes) {
                const initialVariants: { [key: string]: VariantOption } = {};
                product.variantes.forEach(variantGroup => {
                    if (variantGroup.opciones.length > 0) {
                        initialVariants[variantGroup.nombre] = variantGroup.opciones[0];
                    }
                });
                setSelectedVariants(initialVariants);
            }
        }
    }, [product, isOpen]);

    if (!product) return null;

    const handleVariantChange = (groupName: string, option: VariantOption) => {
        setSelectedVariants(prev => ({ ...prev, [groupName]: option }));
    };

    const handleExtraToggle = (extra: ProductExtra) => {
        setSelectedExtras(prev => {
            const exists = prev.some(e => e.nombre === extra.nombre);
            if (exists) return prev.filter(e => e.nombre !== extra.nombre);
            return [...prev, extra];
        });
    };

    const calculateTotal = () => {
        let unitPrice = product.precio_venta;
        Object.values(selectedVariants).forEach(v => unitPrice += (v.precio_extra || 0));
        selectedExtras.forEach(e => unitPrice += (e.precio || 0));
        return unitPrice * quantity;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl w-[95vw] md:w-full max-h-[92vh] overflow-y-auto bg-background border-none text-foreground p-0 rounded-3xl md:rounded-[2.5rem] shadow-2xl custom-scrollbar">
                <div className="flex flex-col md:flex-row">
                    {/* Left Side: Image & Desktop CTA */}
                    <div className="w-full md:w-1/2 bg-background flex flex-col items-center justify-center p-4 md:p-12 border-b md:border-b-0 md:border-r border-border sticky top-0 md:h-[600px] z-20 bg-background/95 backdrop-blur-sm md:bg-background">
                        <div className="relative w-full aspect-[4/3] md:aspect-square flex items-center justify-center group overflow-hidden rounded-2xl md:rounded-none">
                            {product.imagen_url ? (
                                <img
                                    src={product.imagen_url}
                                    alt={product.nombre}
                                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                                />
                            ) : (
                                <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center">
                                    <Plus className="w-16 h-16 text-muted-foreground/20" />
                                </div>
                            )}
                        </div>

                        {/* Desktop Quick Action */}
                        <div className="hidden md:flex flex-col items-center mt-auto w-full pt-8">
                            <div className="flex items-center bg-muted rounded-2xl border border-border h-14 px-2 mb-4">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 text-muted-foreground hover:text-foreground"><Minus className="w-4 h-4" /></button>
                                <span className="w-12 text-center font-black text-xl">{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} className="w-10 text-muted-foreground hover:text-foreground"><Plus className="w-4 h-4" /></button>
                            </div>
                            <Button
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black h-16 rounded-2xl text-lg uppercase shadow-lg"
                                onClick={() => onConfirm(product, quantity, selectedVariants, selectedExtras, notes)}
                            >
                                Añadir {formatCurrency(calculateTotal())}
                            </Button>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-6 left-6 md:right-auto md:left-6 w-10 h-10 bg-background/80 backdrop-blur-sm shadow-md rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Right Side: Info & Options */}
                    <div className="w-full md:w-1/2 p-6 md:p-12 space-y-6 md:space-y-8 min-h-full bg-background">
                        <DialogHeader className="text-left">
                            <div className="flex flex-wrap gap-1.5 mb-3 md:mb-4">
                                {product.sin_tacc && <Badge className="bg-primary/10 text-primary border-none font-bold text-[9px] md:text-[10px] uppercase">Sin TACC</Badge>}
                                {product.apto_vegetariano && <Badge className="bg-green-100 text-green-700 border-none font-bold text-[9px] md:text-[10px] uppercase">Vegetariano</Badge>}
                                {product.apto_vegano && <Badge className="bg-green-100 text-green-700 border-none font-bold text-[9px] md:text-[10px] uppercase">Vegano</Badge>}
                            </div>
                            <DialogTitle className="text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight mb-2 md:mb-3">
                                {product.nombre}
                            </DialogTitle>
                            {product.descripcion_corta && (
                                <p className="text-muted-foreground font-medium text-base md:text-lg leading-relaxed">{product.descripcion_corta}</p>
                            )}
                        </DialogHeader>

                        {/* Technical Specs Bar */}
                        <div className="flex gap-6 py-4 border-y border-border overflow-x-auto no-scrollbar">
                            {product.tiempo_preparacion_minutos && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Preparación</p>
                                        <p className="font-bold text-sm text-foreground">{product.tiempo_preparacion_minutos} min</p>
                                    </div>
                                </div>
                            )}
                            {product.tamanio_porcion && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <Scale className="w-4 h-4 text-primary" />
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Porción</p>
                                        <p className="font-bold text-sm text-foreground">{product.tamanio_porcion}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Ingredients Section */}
                        {(product.ingredientes || (product.alergenos && product.alergenos.length > 0)) && (
                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowFullInfo(!showFullInfo)}
                                    className="flex items-center justify-between w-full py-2 group"
                                >
                                    <span className="text-sm font-black text-foreground uppercase tracking-widest">Detalles y Alérgenos</span>
                                    {showFullInfo ? <ChevronUp className="w-5 h-5 text-muted-foreground/40" /> : <ChevronDown className="w-5 h-5 text-muted-foreground/40" />}
                                </button>
                                {showFullInfo && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        {product.ingredientes && (
                                            <div>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Ingredientes</p>
                                                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                                    {product.ingredientes}
                                                </p>
                                            </div>
                                        )}
                                        {product.alergenos && product.alergenos.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Este producto contiene:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {product.alergenos.map((a, i) => (
                                                        <Badge key={i} variant="outline" className="border-border text-muted-foreground font-bold text-[10px]">
                                                            {a}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Selection Options (Existing functionality) */}
                        <div className="space-y-8 pt-4">
                            {product.variantes && product.variantes.length > 0 && (
                                <div className="space-y-6">
                                    {product.variantes.map((variantGroup, idx) => (
                                        <div key={idx} className="space-y-3">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none block">
                                                Elegí tu {variantGroup.nombre}
                                            </Label>
                                            <RadioGroup
                                                value={selectedVariants[variantGroup.nombre]?.nombre}
                                                onValueChange={(val) => {
                                                    const option = variantGroup.opciones.find(o => o.nombre === val);
                                                    if (option) handleVariantChange(variantGroup.nombre, option);
                                                }}
                                                className="grid grid-cols-2 gap-3"
                                            >
                                                {variantGroup.opciones.map((option, optIdx) => (
                                                    <div key={optIdx}>
                                                        <RadioGroupItem value={option.nombre} id={`v-${idx}-${optIdx}`} className="sr-only peer" />
                                                        <Label
                                                            htmlFor={`v-${idx}-${optIdx}`}
                                                            className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-4 hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-foreground cursor-pointer transition-all h-full text-center"
                                                        >
                                                            <span className="font-bold text-sm leading-tight">{option.nombre}</span>
                                                            {option.precio_extra > 0 && (
                                                                <span className="text-[10px] text-primary font-black uppercase mt-1">
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

                            {product.extras && product.extras.length > 0 && (
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none block">
                                        Personalizá tu pedido
                                    </Label>
                                    <div className="space-y-2">
                                        {product.extras.map((extra, idx) => {
                                            const isSelected = selectedExtras.some(e => e.nombre === extra.nombre);
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleExtraToggle(extra)}
                                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <Checkbox checked={isSelected} className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                                                        <span className={isSelected ? 'text-foreground font-black' : 'text-muted-foreground font-bold'}>
                                                            {extra.nombre}
                                                        </span>
                                                    </div>
                                                    {extra.precio > 0 && (
                                                        <span className="text-xs font-black text-muted-foreground">
                                                            + {formatCurrency(extra.precio)}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none block">Observaciones</Label>
                                <Textarea
                                    placeholder="¿Alguna instrucción especial?"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="bg-muted border-none rounded-2xl h-24 resize-none focus:ring-primary font-medium p-4 text-foreground"
                                />
                            </div>

                            {/* Mobile CTA (only visible on small screens) */}
                            <div className="md:hidden pt-4 border-t border-border flex flex-col gap-4 sticky bottom-0 bg-background/95 backdrop-blur-md pb-4 z-30">
                                <div className="flex gap-4">
                                    <div className="flex items-center bg-muted rounded-2xl flex-1 h-14 border border-border px-2">
                                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex-1 h-full flex items-center justify-center text-muted-foreground"><Minus className="w-5 h-5" /></button>
                                        <span className="w-10 text-center font-black text-foreground text-xl">{quantity}</span>
                                        <button onClick={() => setQuantity(quantity + 1)} className="flex-1 h-full flex items-center justify-center text-muted-foreground"><Plus className="w-5 h-5" /></button>
                                    </div>
                                    <Button
                                        className="flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground font-black h-14 rounded-2xl text-base uppercase shadow-lg"
                                        onClick={() => onConfirm(product, quantity, selectedVariants, selectedExtras, notes)}
                                    >
                                        Añadir {formatCurrency(calculateTotal())}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
