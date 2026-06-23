'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Barcode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Product, ProductVariant } from '@/lib/types';

interface ProductScannerProps {
    products: Product[];
    variants?: ProductVariant[];       // Variantes con SKU/código propio
    onProductScanned: (product: Product, variant?: ProductVariant) => void;
}

function ProductScannerComponent({ products, variants = [], onProductScanned }: ProductScannerProps) {
    const [barcode, setBarcode] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleBarcodeInput = (value: string) => {
        setBarcode(value);
        // Auto-submit cuando el código está completo (EAN-13 = 13 dígitos)
        if (value.length === 13) {
            processBarcode(value);
            setBarcode('');
        }
    };

    const processBarcode = (code: string) => {
        // 1. Buscar coincidencia por variante (SKU o código de barras propio)
        const variant = variants.find(v => v.codigo_barras === code || v.sku === code);
        if (variant) {
            const product = products.find(p => p.id === variant.producto_id);
            if (product) {
                onProductScanned(product, variant);
                return;
            }
        }

        // 2. Buscar por código del producto padre
        const product = products.find(p => p.codigo_barras === code);
        if (product) {
            // Si el producto tiene matriz de variantes, el caller decide si abrir el selector
            onProductScanned(product);
        }
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }
        const results = products.filter(p =>
            p.nombre.toLowerCase().includes(term.toLowerCase()) ||
            (p.marca || '').toLowerCase().includes(term.toLowerCase()) ||
            p.codigo_barras.includes(term)
        ).slice(0, 10);
        setSearchResults(results);
    };

    const handleProductClick = (product: Product) => {
        onProductScanned(product);
        setSearchTerm('');
        setSearchResults([]);
        inputRef.current?.focus();
    };

    return (
        <Card className="border-border bg-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-primary" />
                    Escáner de Productos
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <Barcode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Escanear código de barras..."
                        value={barcode}
                        onChange={(e) => handleBarcodeInput(e.target.value)}
                        className="pl-10 text-lg font-mono"
                        autoFocus
                    />
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar por nombre o marca..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {searchResults.length > 0 && (
                    <div className="border rounded-md max-h-64 overflow-y-auto">
                        {searchResults.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => handleProductClick(product)}
                                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0 flex items-center gap-3"
                            >
                                <div className="w-14 h-14 shrink-0 bg-muted rounded-lg overflow-hidden border border-border flex items-center justify-center">
                                    {product.imagen_url ? (
                                        <img src={product.imagen_url} alt={product.nombre} className="w-full h-full object-cover" />
                                    ) : (
                                        <Barcode className="w-6 h-6 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{product.nombre}</div>
                                    <div className="text-sm text-muted-foreground flex justify-between items-center">
                                        <span className="text-xs font-mono truncate mr-2">{product.codigo_barras}</span>
                                        <span className="text-primary font-semibold shrink-0">
                                            ${product.precio_venta.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export const ProductScanner = React.memo(ProductScannerComponent);
