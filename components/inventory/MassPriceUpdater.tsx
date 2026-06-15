'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { formatCurrency } from '@/lib/utils';

interface MassPriceUpdaterProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
}

export function MassPriceUpdater({ isOpen, onClose, products }: MassPriceUpdaterProps) {
    const [filterType, setFilterType] = useState<'category' | 'supplier'>('category');
    const [selectedFilter, setSelectedFilter] = useState('');
    const [percentage, setPercentage] = useState('');
    const [affectedProducts, setAffectedProducts] = useState<Product[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);

    // Get unique categories and suppliers
    const categories = Array.from(new Set(products.map(p => p.categoria)));
    const suppliers = Array.from(new Set(products.map(p => p.proveedor_id).filter(Boolean)));

    // Calculate affected products
    useEffect(() => {
        if (!selectedFilter) {
            setAffectedProducts([]);
            return;
        }

        const filtered = products.filter(p => {
            if (filterType === 'category') {
                return p.categoria === selectedFilter && p.activo;
            } else {
                return p.proveedor_id === selectedFilter && p.activo;
            }
        });

        setAffectedProducts(filtered);
    }, [filterType, selectedFilter, products]);

    const handleUpdate = async () => {
        if (!percentage || affectedProducts.length === 0) return;

        const percentageValue = parseFloat(percentage);
        if (isNaN(percentageValue)) {
            alert('Ingresa un porcentaje válido');
            return;
        }

        const confirmed = confirm(
            `¿Estás seguro de actualizar ${affectedProducts.length} productos con un incremento del ${percentageValue}%?`
        );

        if (!confirmed) return;

        setIsUpdating(true);

        try {
            const batch = writeBatch(db);

            affectedProducts.forEach(product => {
                const newPrice = product.precio_venta * (1 + percentageValue / 100);
                const productRef = doc(db, 'products', product.id);

                batch.update(productRef, {
                    precio_venta: Math.round(newPrice * 100) / 100, // Round to 2 decimals
                    updated_at: Timestamp.now(),
                });
            });

            await batch.commit();

            alert(`${affectedProducts.length} productos actualizados exitosamente!`);

            // Reset
            setSelectedFilter('');
            setPercentage('');
            setAffectedProducts([]);
            onClose();
        } catch (error) {
            console.error('Error updating prices:', error);
            alert('Error al actualizar los precios');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <TrendingUp className="w-6 h-6 text-gold" />
                        Actualización Masiva de Precios
                    </DialogTitle>
                    <DialogDescription>
                        Aplica un incremento porcentual a múltiples productos
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Filter Type */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Filtrar por</label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant={filterType === 'category' ? 'default' : 'outline'}
                                onClick={() => {
                                    setFilterType('category');
                                    setSelectedFilter('');
                                }}
                            >
                                Categoría
                            </Button>
                            <Button
                                variant={filterType === 'supplier' ? 'default' : 'outline'}
                                onClick={() => {
                                    setFilterType('supplier');
                                    setSelectedFilter('');
                                }}
                            >
                                Proveedor
                            </Button>
                        </div>
                    </div>

                    {/* Filter Selection */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Seleccionar {filterType === 'category' ? 'Categoría' : 'Proveedor'}
                        </label>
                        <select
                            value={selectedFilter}
                            onChange={(e) => setSelectedFilter(e.target.value)}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                        >
                            <option value="">Seleccionar...</option>
                            {filterType === 'category'
                                ? categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))
                                : suppliers.map(sup => (
                                    <option key={sup} value={sup}>{sup}</option>
                                ))
                            }
                        </select>
                    </div>

                    {/* Percentage Input */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Porcentaje de Incremento (%)
                        </label>
                        <Input
                            type="number"
                            value={percentage}
                            onChange={(e) => setPercentage(e.target.value)}
                            placeholder="Ej: 15"
                            className="text-xl"
                            step="0.1"
                        />
                    </div>

                    {/* Preview */}
                    {affectedProducts.length > 0 && percentage && (
                        <div className="border rounded-lg p-4 bg-accent/20">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                <h3 className="font-semibold">
                                    Vista Previa - {affectedProducts.length} productos afectados
                                </h3>
                            </div>

                            <div className="max-h-64 overflow-y-auto space-y-2">
                                {affectedProducts.slice(0, 10).map((product) => {
                                    const newPrice = product.precio_venta * (1 + parseFloat(percentage) / 100);
                                    return (
                                        <div
                                            key={product.id}
                                            className="flex justify-between items-center p-2 bg-background rounded"
                                        >
                                            <span className="text-sm">{product.nombre}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground line-through">
                                                    {formatCurrency(product.precio_venta)}
                                                </span>
                                                <span className="text-sm font-semibold text-gold">
                                                    {formatCurrency(newPrice)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {affectedProducts.length > 10 && (
                                    <p className="text-sm text-muted-foreground text-center">
                                        ... y {affectedProducts.length - 10} productos más
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isUpdating}>
                        Cancelar
                    </Button>
                    <Button
                        variant="gold"
                        onClick={handleUpdate}
                        disabled={affectedProducts.length === 0 || !percentage || isUpdating}
                    >
                        {isUpdating ? 'Actualizando...' : `Actualizar ${affectedProducts.length} Productos`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
