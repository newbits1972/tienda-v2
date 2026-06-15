'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Barcode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Product } from '@/lib/types';
import { parseScaleBarcode, isScaleBarcode } from '@/lib/utils/ean13Parser';

interface ProductScannerProps {
    products: Product[];
    onProductScanned: (product: Product, weight?: number) => void;
    onOpenWeighModal: (product: Product) => void;
}

function ProductScannerComponent({ products, onProductScanned, onOpenWeighModal }: ProductScannerProps) {
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

        // Auto-submit when barcode is complete (13 digits for EAN-13)
        if (value.length === 13) {
            processBarcode(value);
            setBarcode('');
        }
    };

    const processBarcode = (code: string) => {
        // Check if it's a scale barcode (starts with 20)
        if (isScaleBarcode(code)) {
            const parsed = parseScaleBarcode(code);

            if (parsed.isScaleCode && parsed.productId) {
                // Find product by barcode, SKU, or ID
                const product = products.find(p =>
                    p.codigo_barras === code || // Exact EAN match
                    p.codigo_barras === parsed.productId || // Exact SKU match
                    p.codigo_barras.endsWith(parsed.productId!) // SKU match at end
                );

                if (product) {
                    if (product.es_pesable && parsed.weight) {
                        // Scenario A: Value is WEIGHT (grams)
                        // Scenario B: Value is PRICE ($)

                        // We'll treat the value as PRICE for now, as it's the safest for billing
                        const scannedValue = parsed.weight; // this is the 5 digit value

                        // Let's assume PRICE for this implementation pass
                        const calculatedWeight = (scannedValue / product.precio_venta) * 1000;

                        onProductScanned(product, calculatedWeight);
                    } else if (product.es_pesable) {
                        onOpenWeighModal(product);
                    } else {
                        onProductScanned(product);
                    }
                }
            }
        } else {
            // Regular barcode - find exact match
            const product = products.find(p => p.codigo_barras === code);

            if (product) {
                if (product.es_pesable) {
                    onOpenWeighModal(product);
                } else {
                    onProductScanned(product);
                }
            }
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
            p.codigo_barras.includes(term)
        ).slice(0, 10);

        setSearchResults(results);
    };

    const handleProductClick = (product: Product) => {
        if (product.es_pesable) {
            onOpenWeighModal(product);
        } else {
            onProductScanned(product);
        }
        setSearchTerm('');
        setSearchResults([]);
        inputRef.current?.focus();
    };

    return (
        <Card className="border-gold/30 bg-card shadow-[0_0_15px_rgba(212,175,55,0.05)]">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-gold" />
                    Escáner de Productos
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Barcode Scanner Input */}
                <div className="relative">
                    <Barcode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Escanear código de barras..."
                        value={barcode}
                        onChange={(e) => handleBarcodeInput(e.target.value)}
                        className="pl-10 text-lg font-mono border-gold/30 focus-visible:ring-gold/50"
                        autoFocus
                    />
                </div>

                {/* Manual Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10 border-gold/20 focus-visible:ring-gold/50"
                    />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="border rounded-md max-h-64 overflow-y-auto">
                        {searchResults.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => handleProductClick(product)}
                                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0 flex items-center gap-3"
                            >
                                {/* Product Image - Square 1:1 format */}
                                <div className="w-14 h-14 shrink-0 bg-muted rounded-lg overflow-hidden border border-border flex items-center justify-center">
                                    {product.imagen_url ? (
                                        <img
                                            src={product.imagen_url}
                                            alt={product.nombre}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Barcode className="w-6 h-6 text-muted-foreground" />
                                    )}
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{product.nombre}</div>
                                    <div className="text-sm text-muted-foreground flex justify-between items-center">
                                        <span className="text-xs font-mono truncate mr-2">{product.codigo_barras}</span>
                                        <span className="text-gold font-semibold shrink-0">
                                            ${product.precio_venta.toFixed(2)}
                                            {product.es_pesable && '/kg'}
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
