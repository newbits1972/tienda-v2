'use client';

import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
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
import { Search, Plus, Trash2, Printer, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BarcodeGeneratorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
}

interface PrintQueueItem {
    producto: Product;
    variante?: any;
    codigo: string;
    label: string; // Ej: "Talle: M / Negro"
    cantidad: number;
}

export function BarcodeGeneratorDialog({ isOpen, onClose, products }: BarcodeGeneratorDialogProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [queue, setQueue] = useState<PrintQueueItem[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
                            // Colocación centrada: Ancho 38mm, Alto 8mm
                            doc.addImage(barcodeImg, 'PNG', 6, 11, 38, 8);

                            // 5. Código escrito abajo del código de barras
                            doc.setFont('courier', 'normal');
                            doc.setFontSize(6);
                            doc.text(item.codigo, 25, 20, { align: 'center' });

                            // 6. Precio Destacado
                            const precioVenta = item.variante?.precio_venta || item.producto.precio_venta;
                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(9);
                            doc.text(formatCurrency(precioVenta), 25, 23.5, { align: 'center' });

                        } catch (barcodeError) {
                            console.error("Error generating barcode image:", barcodeError);
                            // Fallback de texto si falla el renderizado del código de barras
                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(8);
                            doc.text(item.producto.nombre, 25, 10, { align: 'center' });
                            doc.text(item.codigo, 25, 15, { align: 'center' });
                        }
                    }
                }
            });

            // Guardar e iniciar descarga
            doc.save(`etiquetas-codigo-barras-${Date.now()}.pdf`);
            onClose();
            setQueue([]);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error al generar el PDF de etiquetas.");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl text-foreground bg-background border-border flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Tag className="w-6 h-6 text-primary" />
                        Generador de Etiquetas Térmicas (50x25mm)
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Selecciona prendas y variantes para armar tu cola de impresión de códigos de barra.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden min-h-[400px]">
                    {/* Búsqueda y Selección */}
                    <div className="flex flex-col gap-4 overflow-hidden h-full">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar productos por nombre o código..."
                                className="pl-9 bg-muted/20 border-border"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-hide">
                            {filteredProducts.map((p) => {
                                const tieneVariantes = p.variantes && p.variantes.length > 0;
                                return (
                                    <div key={p.id} className="p-3 bg-muted/40 rounded-xl border border-border space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-sm">{p.nombre}</p>
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
                                            <div className="pt-1 border-t border-border/50 grid grid-cols-2 gap-1">
                                                {p.variantes!.map((v, vi) => (
                                                    <Button
                                                        key={vi}
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => addToQueue(p, v)}
                                                        className="text-[10px] h-7 bg-card border border-border/50 hover:bg-muted justify-between"
                                                    >
                                                        <span>{v.talle} / {v.color}</span>
                                                        <Plus className="w-3 h-3 text-primary" />
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Cola de Impresión */}
                    <div className="flex flex-col gap-4 overflow-hidden h-full border-l border-border pl-6">
                        <p className="font-bold text-sm flex justify-between items-center text-muted-foreground uppercase tracking-widest text-[10px]">
                            <span>Cola de Impresión</span>
                            <Badge variant="secondary">{queue.reduce((acc, i) => acc + i.cantidad, 0)} etiquetas</Badge>
                        </p>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-hide">
                            {queue.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-8 border border-dashed border-border rounded-2xl">
                                    <Tag className="w-8 h-8 mb-2 text-muted-foreground/30" />
                                    <p className="text-xs">No hay productos en la cola de impresión.</p>
                                </div>
                            ) : (
                                queue.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-xs truncate">{item.producto.nombre}</p>
                                            <p className="text-[10px] text-muted-foreground">{item.label} · <span className="font-mono text-primary/70">{item.codigo}</span></p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                className="w-16 h-8 text-center bg-card border-border font-bold text-xs"
                                                value={item.cantidad}
                                                onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => removeFromQueue(idx)}
                                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Canvas de renderizado de código de barras oculto */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <DialogFooter className="border-t border-border pt-6 mt-4">
                    <Button variant="outline" onClick={onClose} className="border-border text-muted-foreground hover:text-foreground hover:bg-muted">
                        Cerrar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={generatePDF}
                        disabled={queue.length === 0}
                        className="px-8 shadow-primary/20"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Generar PDF de Etiquetas
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
