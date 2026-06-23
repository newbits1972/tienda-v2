'use client';

import { create } from 'zustand';
import { CartItem, Product, ProductVariant } from '@/lib/types';

interface CartStore {
    items: CartItem[];
    branchId: string | null;       // Sucursal activa desde donde se vende
    setBranchId: (branchId: string | null) => void;
    addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    getTotal: () => number;
    getItemCount: () => number;
}

/**
 * Firma única por combinación producto + variante (talle×color).
 * Se usa para mergear líneas duplicadas en el carrito.
 */
const getCartItemSignature = (product: Product, variant?: ProductVariant) => {
    return JSON.stringify({
        pId: product.id,
        vId: variant?.id || null,
    });
};

/**
 * Precio unitario efectivo: override de la variante o default del producto.
 */
const getUnitPrice = (product: Product, variant?: ProductVariant): number => {
    if (variant?.precio_venta != null) return variant.precio_venta;
    return product.precio_venta;
};

export const useCart = create<CartStore>((set, get) => ({
    items: [],
    branchId: null,

    setBranchId: (branchId) => set({ branchId }),

    addItem: (product, variant, quantity = 1) => {
        const items = get().items;
        const signature = getCartItemSignature(product, variant);
        const unitPrice = getUnitPrice(product, variant);

        const existingIndex = items.findIndex(item =>
            getCartItemSignature(item.producto, item.variante) === signature
        );

        if (existingIndex >= 0) {
            // Mergear con línea existente
            const existing = items[existingIndex];
            const newQuantity = existing.cantidad + quantity;
            set({
                items: items.map((item, idx) =>
                    idx === existingIndex
                        ? { ...item, cantidad: newQuantity, subtotal: unitPrice * newQuantity }
                        : item
                ),
            });
        } else {
            set({
                items: [...items, {
                    internalId: Math.random().toString(36).substring(2, 9),
                    producto: product,
                    variante: variant,
                    variante_id: variant?.id,
                    cantidad: quantity,
                    subtotal: unitPrice * quantity,
                }],
            });
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

        const unitPrice = getUnitPrice(item.producto, item.variante);

        set({
            items: items.map(i =>
                i.internalId === itemId
                    ? { ...i, cantidad: quantity, subtotal: unitPrice * quantity }
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

    getItemCount: () => {
        return get().items.reduce((count, item) => count + item.cantidad, 0);
    },
}));
