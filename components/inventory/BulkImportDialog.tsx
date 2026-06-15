'use client';

import React, { useState } from 'react';
import {
    collection,
    writeBatch,
    doc,
    Timestamp,
    query,
    getDocs,
    where
} from 'firebase/firestore';
import {
    FileSpreadsheet,
    Upload,
    AlertCircle,
    CheckCircle2,
    Trash2,
    ArrowRight,
    ArrowLeft,
    Database,
    Table as TableIcon
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase/config';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useTenant } from '@/hooks/useTenant';
import { parseBulkText, RawBulkData } from '@/lib/utils/csvParser';

interface BulkImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    defaultType?: 'producto' | 'materia_prima';
    tenantId?: string;
}

type ImportStep = 'input' | 'mapping' | 'validation' | 'importing';

// Define available database fields for mapping
// Define available database fields for mapping
const DB_FIELDS = [
    { id: 'nombre', label: 'Nombre', required: true },
    { id: 'categoria', label: 'Categoría', required: true }, // Can be auto-created?
    { id: 'codigo_barras', label: 'Código (SKU/Barra)', required: false },
    { id: 'precio_costo', label: 'Costo (Compra)', required: false, type: 'number' },
    { id: 'precio_venta', label: 'Precio Venta', required: false, type: 'number' }, // Conditional validation later
    { id: 'stock_actual', label: 'Stock Actual', required: false, type: 'number' },
    { id: 'stock_minimo', label: 'Stock Mínimo', required: false, type: 'number' },
    { id: 'unidad', label: 'Unidad (kg/un/lt)', required: false },
    { id: 'es_pesable', label: '¿Es Pesable?', required: false, type: 'boolean' },
    { id: 'proveedor_id', label: 'ID Proveedor', required: false }, // Advanced
];

export function BulkImportDialog({ isOpen, onClose, defaultType = 'producto', tenantId: propTenantId }: BulkImportDialogProps) {
    const { tenantId: contextTenantId } = useTenant();
    const activeTenantId = propTenantId || contextTenantId || 'default_store';
    const [rawText, setRawText] = useState('');
    const [rawData, setRawData] = useState<RawBulkData | null>(null);
    const [columnMapping, setColumnMapping] = useState<{ [index: number]: string }>({});
    const [step, setStep] = useState<ImportStep>('input');
    const [parsedProducts, setParsedProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const handleParseRaw = () => {
        if (!rawText.trim()) return;
        const result = parseBulkText(rawText);
        if (result.headers.length === 0) {
            setErrors(['No se detectaron datos válidos.']);
            return;
        }
        setRawData(result);

        // Auto-guess mapping
        const newMapping: { [index: number]: string } = {};
        result.headers.forEach((header, index) => {
            const h = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (h.includes('nombre') || h.includes('producto')) newMapping[index] = 'nombre';
            else if (h.includes('cat') || h.includes('rubro')) newMapping[index] = 'categoria';
            else if (h.includes('cod') || h.includes('sku')) newMapping[index] = 'codigo_barras';
            else if (h.includes('costo')) newMapping[index] = 'precio_costo';
            else if (h.includes('venta') || h.includes('final') || h.includes('precio')) newMapping[index] = 'precio_venta';
            else if (h.includes('stock') || h.includes('cant')) newMapping[index] = 'stock_actual';
            else if (h.includes('min')) newMapping[index] = 'stock_minimo';
            else if (h.includes('uni')) newMapping[index] = 'unidad';
            else if (h.includes('pesa') || h.includes('kg')) newMapping[index] = 'es_pesable';
            else if (h.includes('vegan')) newMapping[index] = 'apto_vegano';
            else if (h.includes('tacc') || h.includes('celia')) newMapping[index] = 'sin_tacc';
        });

        setColumnMapping(newMapping);
        setStep('mapping');
        setErrors([]);
    };

    const processMapping = () => {
        if (!rawData) return;

        const products: any[] = [];
        const validationErrors: string[] = [];

        // Check required fields are mapped
        const mappedFields = Object.values(columnMapping);
        const missingRequired = DB_FIELDS.filter(f => {
            if (f.id === 'precio_venta' && defaultType === 'materia_prima') return false; // Not required for raw materials
            return f.required && !mappedFields.includes(f.id);
        });

        if (missingRequired.length > 0) {
            setErrors([`Faltan asignar columnas obligatorias: ${missingRequired.map(f => f.label).join(', ')}`]);
            return;
        }

        rawData.rows.forEach((row, rowIndex) => {
            const product: any = { activo: true }; // Default active
            let isValid = true;

            Object.entries(columnMapping).forEach(([colIndexStr, fieldId]) => {
                const colIndex = parseInt(colIndexStr);
                const rawVal = row[colIndex]?.trim() || '';
                const fieldDef = DB_FIELDS.find(f => f.id === fieldId);

                if (!fieldDef) return;

                if (fieldDef.type === 'number') {
                    const num = parseFloat(rawVal.replace(/[^\d.,-]/g, '').replace(',', '.'));
                    if (fieldDef.required && (isNaN(num) || rawVal === '')) {
                        // Allow 0? Yes. but check empty
                        if (rawVal === '') isValid = false;
                        else product[fieldId] = num;
                    } else {
                        product[fieldId] = isNaN(num) ? null : num;
                    }
                } else if (fieldDef.type === 'boolean') {
                    const lower = rawVal.toLowerCase();
                    product[fieldId] = ['si', 's', 'true', '1', 'yes'].includes(lower);
                } else {
                    product[fieldId] = rawVal;
                }
            });

            // Default defaults
            if (!product.stock_minimo) product.stock_minimo = 0;

            // Unit Normalization
            if (product.unidad) {
                const u = product.unidad.toLowerCase();
                if (u.includes('kg') || u.includes('kilo')) product.unidad = 'kg';
                else if (u.includes('lt') || u.includes('litro')) product.unidad = 'litro';
                else product.unidad = 'unidad';
            } else {
                product.unidad = product.es_pesable ? 'kg' : 'unidad';
            }

            if (product.es_pesable === undefined) product.es_pesable = product.unidad === 'kg';

            // Safe defaults for types
            if (defaultType === 'materia_prima' && !product.precio_venta) product.precio_venta = 0;

            // Basic validation
            if (!product.nombre || !product.categoria) isValid = false;

            if (isValid) {
                products.push(product);
            } else {
                // If row is empty completely, ignore, else log error??
                // For simplified UX, we filter out valid ones only but warn count
            }
        });

        setParsedProducts(products);
        setStep('validation');
    };

    const handleImport = async () => {
        setLoading(true);
        setStep('importing');

        try {
            const batch = writeBatch(db);
            const productsRef = collection(db, 'products');

            // Limit batch to 500
            const batchSize = 450;

            // To be robust we should run this in loop but let's assume < 450 for now or slice
            const chunks = [];
            for (let i = 0; i < parsedProducts.length; i += batchSize) {
                chunks.push(parsedProducts.slice(i, i + batchSize));
            }

            for (const chunk of chunks) {
                const currentBatch = writeBatch(db);
                chunk.forEach(p => {
                    const docRef = doc(productsRef);
                    currentBatch.set(docRef, {
                        ...p,
                        tipo: p.tipo || defaultType,
                        created_at: Timestamp.now(),
                        updated_at: Timestamp.now(),
                        tenantId: activeTenantId
                    });
                });
                await currentBatch.commit();
            }

            // Success feedback handled by parent or alert
            alert(`¡Importación completada! ${parsedProducts.length} productos agregados.`);
            onClose();
        } catch (error) {
            console.error(error);
            setErrors(['Error crítico al escribir en base de datos.']);
            setStep('validation');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep('input');
        setRawText('');
        setParsedProducts([]);
        setErrors([]);
        setRawData(null);
        setColumnMapping({});
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col p-0 bg-card border-border text-foreground">
                <DialogHeader className="p-6 border-b border-gold/10 bg-muted/50">
                    <DialogTitle className="text-2xl font-bold text-gold flex items-center gap-3">
                        <FileSpreadsheet className="w-6 h-6" />
                        Asistente de Carga Masiva
                    </DialogTitle>
                </DialogHeader>

                {/* Stepper Wizard Indicator */}
                <div className="flex items-center justify-center p-4 border-b border-border bg-muted/30 gap-4 text-xs">
                    <div className={`flex items-center gap-2 ${step === 'input' ? 'text-gold font-bold' : 'text-muted-foreground'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${step === 'input' ? 'border-gold' : 'border-border'}`}>1</span> Datos
                    </div>
                    <div className="w-8 h-[1px] bg-border" />
                    <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-gold font-bold' : 'text-muted-foreground'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${step === 'mapping' ? 'border-gold' : 'border-border'}`}>2</span> Mapeo
                    </div>
                    <div className="w-8 h-[1px] bg-border" />
                    <div className={`flex items-center gap-2 ${['validation', 'importing'].includes(step) ? 'text-gold font-bold' : 'text-muted-foreground'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${['validation', 'importing'].includes(step) ? 'border-gold' : 'border-border'}`}>3</span> Revisión
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-background/50">

                    {/* STEP 1: INPUT */}
                    {step === 'input' && (
                        <div className="space-y-4 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-2">
                                <h4 className="font-bold text-blue-400 mb-1 flex items-center gap-2">
                                    <Database className="w-4 h-4" /> Importar desde Excel
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    Copia tus celdas de Excel (incluyendo encabezados) y pégalas abajo.
                                    El sistema detectará automáticamente las columnas.
                                </p>
                            </div>
                            <Label className="text-foreground/80">Pegar datos aquí (Ctrl+V):</Label>
                            <Textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder="Nombre	Categoria	Precio..."
                                className="flex-1 font-mono text-xs bg-background border-border focus:border-gold/50 min-h-[300px]"
                            />
                        </div>
                    )}

                    {/* STEP 2: MAPPING */}
                    {step === 'mapping' && rawData && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div className="bg-gold/5 border border-gold/10 rounded-lg p-4">
                                <h4 className="font-bold text-gold mb-1">Confirma las columnas</h4>
                                <p className="text-xs text-muted-foreground">
                                    Asigna cada columna de tu archivo a un campo del sistema.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {rawData.headers.map((header, index) => (
                                    <div key={index} className="bg-card p-3 rounded-lg border border-border flex flex-col gap-2 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-mono text-muted-foreground">Columna {index + 1}</span>
                                            {/* Preview first value */}
                                            {rawData.rows[0] && (
                                                <Badge variant="outline" className="text-[10px] text-muted-foreground max-w-[120px] truncate">
                                                    Ej: {rawData.rows[0][index]}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-sm font-bold text-foreground truncate mb-1" title={header}>
                                            {header}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-zinc-600 mx-auto transform rotate-90" />
                                        <Select
                                            value={columnMapping[index] || ''}
                                            onValueChange={(val) => setColumnMapping({ ...columnMapping, [index]: val })}
                                        >
                                            <SelectTrigger className="h-8 text-xs bg-background border-border">
                                                <SelectValue placeholder="Ignorar columna" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-border">
                                                <SelectItem value="ignore">-- Ignorar --</SelectItem>
                                                {DB_FIELDS.filter(f => {
                                                    if (defaultType === 'materia_prima' && f.id === 'precio_venta') return false;
                                                    return true;
                                                }).map(field => (
                                                    <SelectItem key={field.id} value={field.id}>
                                                        {field.label} {field.required ? '*' : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: VALIDATION */}
                    {['validation', 'importing'].includes(step) && (
                        <div className="space-y-4 animate-in fade-in zoom-in-95">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <TableIcon className="w-5 h-5 text-gold" />
                                    Vista Previa ({parsedProducts.length} listos)
                                </h3>
                                <div className="text-xs text-muted-foreground">
                                    {rawData && rawData.rows.length - parsedProducts.length > 0 && (
                                        <span className="text-red-400 font-bold">
                                            {rawData.rows.length - parsedProducts.length} filas inválidas ignoradas
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                <div className="max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-muted text-muted-foreground font-bold sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3">Nombre</th>
                                                <th className="p-3">Categ.</th>
                                                <th className="p-3 text-right">Costo</th>
                                                <th className="p-3 text-right">Venta</th>
                                                <th className="p-3 text-right">Stock</th>
                                                <th className="p-3 text-center">Tags</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {parsedProducts.map((p, i) => (
                                                <tr key={i} className="hover:bg-muted/50">
                                                    <td className="p-3 font-medium text-foreground">{p.nombre}</td>
                                                    <td className="p-3 text-muted-foreground">{p.categoria}</td>
                                                    <td className="p-3 text-right text-muted-foreground/60">{formatCurrency(p.precio_costo)}</td>
                                                    <td className="p-3 text-right text-gold font-bold">{formatCurrency(p.precio_venta)}</td>
                                                    <td className="p-3 text-right">
                                                        <Badge variant="outline" className={p.stock_actual <= p.stock_minimo ? 'border-red-500 text-red-500' : 'border-border'}>
                                                            {p.stock_actual}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-center flex gap-1 justify-center">
                                                        {p.apto_vegano && <span className="text-[9px] bg-green-900 text-green-400 px-1 rounded">VG</span>}
                                                        {p.sin_tacc && <span className="text-[9px] bg-orange-900 text-orange-400 px-1 rounded">ST</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ERROR DISPLAY */}
                    {errors.length > 0 && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <h5 className="text-red-400 font-bold text-sm mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Errores detectados:
                            </h5>
                            <ul className="list-disc list-inside text-xs text-red-300 space-y-1">
                                {errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 border-t border-gold/10 bg-muted/50 flex justify-between items-center w-full">
                    {step === 'input' ? (
                        <>
                            <Button variant="ghost" onClick={onClose} className="text-muted-foreground">Cancelar</Button>
                            <Button variant="gold" onClick={handleParseRaw} disabled={!rawText.trim()}>
                                Siguiente: Mapear Columnas
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </>
                    ) : step === 'mapping' ? (
                        <>
                            <Button variant="ghost" onClick={() => setStep('input')} className="text-muted-foreground">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                            </Button>
                            <Button variant="gold" onClick={processMapping}>
                                Siguiente: Validar
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setStep('mapping')} disabled={loading || step === 'importing'} className="text-muted-foreground">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Corregir Mapeo
                            </Button>
                            <Button
                                variant="gold"
                                onClick={handleImport}
                                disabled={loading || parsedProducts.length === 0}
                                className={loading ? "opacity-80" : ""}
                            >
                                {loading ? 'Importando...' : `Confirmar Importación (${parsedProducts.length})`}
                                {!loading && <CheckCircle2 className="w-4 h-4 ml-2" />}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
