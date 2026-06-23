'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product, StoreConfig } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shirt, Store as StoreIcon } from 'lucide-react';

/**
 * Catálogo online público (tienda propia) — VERSIÓN STUB TEMPORAL.
 *
 * La Fase 4 del plan de migración reescribirá completamente esta página con:
 *  - Selector talle×color (ShopVariantSelector)
 *  - Filtros por talle/color/marca/temporada/género
 *  - BOPIS cross-store
 *
 * Por ahora solo muestra el catálogo en modo lectura para no romper la app.
 */
export default function CatalogoTiendaPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;

    const [products, setProducts] = useState<Product[]>([]);
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(db, 'products'),
            where('tenantId', '==', tenantId),
            where('activo', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Product);
            setProducts(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Cargando tienda...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
                    {storeConfig?.branding?.logoUrl ? (
                        <img src={storeConfig.branding.logoUrl} alt="logo" className="h-8" />
                    ) : (
                        <StoreIcon className="w-6 h-6 text-primary" />
                    )}
                    <div>
                        <h1 className="text-xl font-bold">{storeConfig?.nombre || 'Tienda Online'}</h1>
                        <p className="text-xs text-muted-foreground">Indumentaria & Moda</p>
                    </div>
                </div>
            </header>

            {/* Catálogo (placeholder — la Fase 4 lo amplía con filtros + variante selector) */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Shirt className="w-6 h-6 text-primary" />
                        Productos
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {products.length} productos disponibles · Selección de talles y colores próximamente
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map(product => (
                        <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="aspect-square bg-muted flex items-center justify-center">
                                {product.imagen_url ? (
                                    <img
                                        src={product.imagen_url}
                                        alt={product.nombre}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Shirt className="w-12 h-12 text-muted-foreground/50" />
                                )}
                            </div>
                            <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h3 className="font-medium text-sm line-clamp-2 flex-1">{product.nombre}</h3>
                                    {product.marca && (
                                        <Badge variant="secondary" className="text-[9px] shrink-0">{product.marca}</Badge>
                                    )}
                                </div>
                                <p className="text-lg font-bold text-primary">
                                    {formatCurrency(product.precio_venta)}
                                </p>
                                {(product.talles_disponibles?.length || 0) > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {product.talles_disponibles!.map(t => (
                                            <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {products.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground">
                        <Shirt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Todavía no hay productos publicados en esta tienda.</p>
                    </div>
                )}
            </main>

            <footer className="border-t mt-12 py-6 text-center text-xs text-muted-foreground">
                © {new Date().getFullYear()} · Catálogo powered by DataSense Retail
            </footer>
        </div>
    );
}
