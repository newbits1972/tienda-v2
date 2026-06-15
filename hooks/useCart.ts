'use client';

import { create } from 'zustand';
import { CartItem, Product, VariantOption, ProductExtra } from '@/lib/types';
import { calculateWeighablePrice } from '@/lib/utils';

interface CartStore {
    items: CartItem[];
    addItem: (
        product: Product,
        quantity?: number,
        pesoGramos?: number,
        variants?: { [key: string]: VariantOption },
        extras?: ProductExtra[],
        notes?: string
    ) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    getTotal: () => number;
}

// Helper to compare items for equality (to merge duplicates)
const getCartItemSignature = (product: Product, variants?: any, extras?: any, notes?: string) => {
    return JSON.stringify({
        pId: product.id,
        v: variants || {},
        e: extras ? extras.map((e: any) => e.nombre).sort() : [], // Compare extra names sorted
        n: notes || ''
    });
};

export const useCart = create<CartStore>((set, get) => ({
    items: [],

    addItem: (product, quantity = 1, pesoGramos, variants, extras, notes) => {
        const items = get().items;
        const newSignature = getCartItemSignature(product, variants, extras, notes);

        const existingItemIndex = items.findIndex(item =>
            getCartItemSignature(item.producto, item.selectedVariants, item.selectedExtras, item.notas) === newSignature
        );

        // Calculate unit price including variants and extras
        // Note: Weighable items usually don't have variants/extras that affect price per kg in this model, 
        // but if they did, we'd add to base price.
        // For now assuming variants/extras are fixed costs added to unit price for non-weighable, 
        // or potentially per-kg for weighable?
        // Let's assume standard behavior:
        // Base Price + Sum(Variants) + Sum(Extras)

        let unitPrice = product.precio_venta;

        // Add variants cost
        if (variants) {
            Object.values(variants).forEach(v => {
                unitPrice += (v.precio_extra || 0);
            });
        }

        // Add extras cost
        if (extras) {
            extras.forEach(e => {
                unitPrice += (e.precio || 0);
            });
        }

        if (product.es_pesable && pesoGramos) {
            // For weighable: Price is (Price Per Kg * Weight) + (Extras * 1?? Or extras per portion?)
            // Usually extras for weighable stuff (like cheese + ham) might be separate?
            // Let's assume for now extras are fixed price added to the *package*.
            // So: (WeightPrice) + ExtrasCost.

            const weightPrice = calculateWeighablePrice(product.precio_venta, pesoGramos);
            // Extras/Variants total cost (flat fee)
            let extrasCost = 0;
            if (variants) Object.values(variants).forEach(v => extrasCost += (v.precio_extra || 0));
            if (extras) extras.forEach(e => extrasCost += (e.precio || 0));

            const finalSubtotal = weightPrice + extrasCost;

            if (existingItemIndex >= 0) {
                // Merge with existing
                const existingItem = items[existingItemIndex];
                const newWeight = (existingItem.peso_gramos || 0) + pesoGramos;
                const newWeightPrice = calculateWeighablePrice(product.precio_venta, newWeight);
                // We assume extras are per "item entry", but if we merge weight, do we merge extras cost?
                // Logic: 100g Cheese (Extra Box) + 100g Cheese (Extra Box) = 200g Cheese (Extra Box x1?)
                // NO, if I add again, usually I want another package.
                // Weighable items shouldn't merge if they have distinct packaging/extras usually.
                // BUT, previous logic merged weights.
                // Let's keep merging weight but only if signature is exact.

                // If I add exact same thing, I probably expect 200g total.
                // But what about the fixed extra cost? 
                // Let's just update the weight and recalculate weight price, keeping the single extra cost.
                // OR, don't merge weighable items with extras?
                // Simpler: Just update weight.

                set({
                    items: items.map((item, idx) =>
                        idx === existingItemIndex
                            ? {
                                ...item,
                                peso_gramos: newWeight,
                                subtotal: newWeightPrice + extrasCost // Re-calc? 
                            }
                            : item
                    ),
                });
            } else {
                // Add new
                set({
                    items: [...items, {
                        internalId: Math.random().toString(36).substring(2, 9),
                        producto: product,
                        cantidad: 1, // acts as "1 package"
                        peso_gramos: pesoGramos,
                        subtotal: finalSubtotal,
                        selectedVariants: variants,
                        selectedExtras: extras,
                        notas: notes
                    }],
                });
            }
        } else {
            // Non-weighable (Standard pieces)
            const itemSubtotal = unitPrice * quantity;

            if (existingItemIndex >= 0) {
                // Increase quantity
                const existingItem = items[existingItemIndex];
                const newQuantity = existingItem.cantidad + quantity;
                const newSubtotal = unitPrice * newQuantity;

                set({
                    items: items.map((item, idx) =>
                        idx === existingItemIndex
                            ? { ...item, cantidad: newQuantity, subtotal: newSubtotal }
                            : item
                    ),
                });
            } else {
                // Add new
                set({
                    items: [...items, {
                        internalId: Math.random().toString(36).substring(2, 9),
                        producto: product,
                        cantidad: quantity,
                        subtotal: itemSubtotal,
                        selectedVariants: variants,
                        selectedExtras: extras,
                        notas: notes
                    }],
                });
            }
        }
    },

    removeItem: (itemId) => {
        set({
            items: get().items.filter(item => item.internalId !== itemId),
        });
    },

    updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
            get().removeItem(itemId);
            return;
        }

        const items = get().items;
        const item = items.find(i => i.internalId === itemId);
        if (!item) return;

        // Recalculate subtotal
        let unitPrice = item.producto.precio_venta;

        // Add variants cost
        if (item.selectedVariants) {
            Object.values(item.selectedVariants).forEach(v => {
                unitPrice += (v.precio_extra || 0);
            });
        }

        // Add extras cost
        if (item.selectedExtras) {
            item.selectedExtras.forEach(e => {
                unitPrice += (e.precio || 0);
            });
        }

        const newSubtotal = unitPrice * quantity;

        set({
            items: items.map(i =>
                i.internalId === itemId
                    ? {
                        ...i,
                        cantidad: quantity,
                        subtotal: newSubtotal,
                    }
                    : i
            ),
        });
    },

    clearCart: () => {
        set({ items: [] });
    },

    getTotal: () => {
        return get().items.reduce((total, item) => total + item.subtotal, 0);
    },
}));
