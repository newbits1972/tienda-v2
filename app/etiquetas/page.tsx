'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { Search, Plus, Trash2, Printer, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PrintQueueItem {
    producto: Product;
    variante?: any;
    codigo: string;
    label: string; // Ej: "Talle: M / Negro"
    cantidad: number;
}

export default function EtiquetasPage() {
    const { user } = useAuth();
    const { tenantId } = useTenant();
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [queue, setQueue] = useState<PrintQueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Cargar productos en tiempo real
    useEffect(() => {
        let q;
        if (user?.rol === 'superadmin') {
            q = query(collection(db, 'products'));
        } else {
            if (!tenantId) return;
            q = query(collection(db, 'products'), where('tenantId', '==', tenantId));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Product[];
            setProducts(productsData);
            setLoading(false);
        }, (error) => {
            console.error("Error loading products:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId, user?.rol]);

    const filteredProducts = products.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo_barras.includes(searchTerm) ||
        (p.marca || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addToQueue = (product: Product, variante?: any) => {
        const codigo = variante ? (variante.codigo_barras || variante.sku || product.codigo_barras) : product.codigo_barras;
        const label = variante ? `Talle: ${variante.talle} / Color: ${variante.color || '-'}` : 'Único';
        
        // Evitar duplicados incrementando cantidad
        const existingIndex = queue.findIndex(item => item.codigo === codigo);
        if (existingIndex > -1) {
            const newQueue = [...queue];
            newQueue[existingIndex].cantidad += 1;
            setQueue(newQueue);
        } else {
            setQueue([...queue, {
                producto: product,
                variante,
                codigo,
                label,
                cantidad: 1
            }]);
        }
    };

    const removeFromQueue = (index: number) => {
        setQueue(queue.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, qty: number) => {
        const newQueue = [...queue];
        newQueue[index].cantidad = Math.max(1, qty);
        setQueue(newQueue);
    };

    const generatePDF = () => {
        if (queue.length === 0) return;

        try {
            // Inicializar jsPDF con tamaño de etiqueta de 50mm x 25mm en modo apaisado (landscape)
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [50, 25]
            });

            let isFirstPage = true;

            queue.forEach(item => {
                for (let i = 0; i < item.cantidad; i++) {
                    if (!isFirstPage) {
                        doc.addPage([50, 25], 'landscape');
                    }
                    isFirstPage = false;

                    // Renderizar código de barras en el canvas oculto
                    if (canvasRef.current) {
                        try {
                            JsBarcode(canvasRef.current, item.codigo, {
                                format: item.codigo.length === 13 ? 'EAN13' : 'CODE128',
                                width: 2,
                                height: 40,
                                displayValue: false, // Dibujaremos el texto manualmente para que quepa mejor
                                margin: 0
                            });

                            const barcodeImg = canvasRef.current.toDataURL('image/png');
                            
                            // 1. Nombre de la Tienda
                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(7);
                            doc.text('TiendaLink', 25, 4, { align: 'center' });

                            // 2. Nombre del Producto (Truncado si es largo)
                            let nombreProd = item.producto.nombre;
                            if (nombreProd.length > 25) nombreProd = nombreProd.substring(0, 22) + '...';
                            doc.setFont('helvetica', 'normal');
                            doc.setFontSize(6);
                            doc.text(nombreProd, 25, 7, { align: 'center' });

                            // 3. Atributos (Talle/Color)
                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(6);
                            doc.text(item.label, 25, 10, { align: 'center' });

                            // 4. Imagen de Código de Barras
                            doc.addImage(barcodeImg, 'PNG', 6, 11, 38, 8);

                            // 5. Código escrito abajo
                            doc.setFont('courier', 'normal');
                            doc.setFontSize(6);
                            doc.text(item.codigo, 25, 20, { align: 'center' });

                            // 6. Precio Destacado
                            const precioVenta = item.variante?.precio_venta || item.producto.precio_venta;
                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(9);
                            doc.text(formatCurrency(precioVenta), 25, 23.5, { align: 'center' });

                        } catch (barcodeError) {
                            console.error("Error al generar imagen de código de barras:", barcodeError);
                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(8);
                            doc.text(item.producto.nombre, 25, 10, { align: 'center' });
                            doc.text(item.codigo, 25, 15, { align: 'center' });
                        }
                    }
                }
            });

            // Guardar e descargar
            doc.save(`etiquetas-codigo-barras-${Date.now()}.pdf`);
            setQueue([]);
        } catch (error) {
            console.error("Error al generar PDF:", error);
            alert("Error al generar el PDF de etiquetas.");
        }
    };

    return (
        <div className="min-h-screen bg-background p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gold mb-2 flex items-center gap-2">
                    <Tag className="w-8 h-8 text-gold" />
                    Generador de Etiquetas Térmicas (50x25mm)
                </h1>
                <p className="text-muted-foreground">Crea hojas de etiquetas térmicas de códigos de barras para tu inventario.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)] min-h-[500px]">
                {/* Panel Izquierdo: Selección de Productos */}
                <Card className="flex flex-col overflow-hidden bg-card border-border h-full">
                    <CardHeader className="border-b border-border bg-muted/20">
                        <CardTitle className="text-lg">Seleccionar Productos</CardTitle>
                        <CardDescription>Busca y añade prendas o variantes individuales a la cola</CardDescription>
                        <div className="relative mt-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, marca o código..."
                                className="pl-9 bg-background border-border"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : filteredProducts.map((p) => {
                            const tieneVariantes = p.variantes && p.variantes.length > 0;
                            return (
                                <div key={p.id} className="p-3 bg-muted/30 rounded-xl border border-border/80 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-sm text-foreground">{p.nombre}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono">{p.codigo_barras}</p>
                                        </div>
                                        {!tieneVariantes && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => addToQueue(p)}
                                                className="border-primary/20 hover:bg-primary/10 text-primary h-8"
                                            >
                                                <Plus className="w-4 h-4 mr-1" /> Añadir
                                            </Button>
                                        )}
                                    </div>

                                    {tieneVariantes && (
                                        <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-1">
                                            {p.variantes!.map((v, vi) => (
                                                <Button
                                                    key={vi}
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => addToQueue(p, v)}
                                                    className="text-[10px] h-8 bg-card border border-border/50 hover:bg-muted justify-between px-3"
                                                >
                                                    <span className="font-medium text-muted-foreground">{v.talle} / {v.color}</span>
                                                    <Plus className="w-3.5 h-3.5 text-primary" />
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {!loading && filteredProducts.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-8">No se encontraron productos.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Panel Derecho: Cola de Impresión */}
                <Card className="flex flex-col overflow-hidden bg-card border-border h-full">
                    <CardHeader className="border-b border-border bg-muted/20 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Cola de Impresión</CardTitle>
                            <CardDescription>Ajusta las cantidades de etiquetas que vas a imprimir</CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-sm font-bold bg-primary/10 text-primary border-primary/20">
                            {queue.reduce((acc, i) => acc + i.cantidad, 0)} etiquetas
                        </Badge>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                        {queue.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-8 border border-dashed border-border rounded-2xl bg-muted/10">
                                <Tag className="w-12 h-12 mb-3 text-muted-foreground/30" />
                                <p className="text-sm font-medium">La cola de etiquetas está vacía.</p>
                                <p className="text-xs text-muted-foreground/75 mt-1">Busca productos a la izquierda y añádelos aquí.</p>
                            </div>
                        ) : (
                            queue.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{item.producto.nombre}</p>
                                        <p className="text-xs text-muted-foreground">{item.label} · <span className="font-mono text-primary/70">{item.codigo}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            className="w-16 h-9 text-center bg-background border-border font-bold text-sm"
                                            value={item.cantidad}
                                            onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeFromQueue(idx)}
                                            className="h-9 w-9 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="w-4.5 h-4.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>

                    {/* Canvas oculto para códigos de barra */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Footer con acciones */}
                    <div className="p-4 border-t border-border bg-muted/20 flex gap-2 justify-end">
                        <Button
                            variant="primary"
                            onClick={generatePDF}
                            disabled={queue.length === 0}
                            className="w-full sm:w-auto px-8 shadow-primary/20"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Generar PDF de Etiquetas
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
