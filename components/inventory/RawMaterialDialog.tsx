'use client';

import React, { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp, collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Product, Supplier } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { useTenant } from '@/hooks/useTenant';
import { cleanUndefined } from '@/lib/utils';
import { Package, Truck, Scale, DollarSign, AlertTriangle, Save } from 'lucide-react';

const rawMaterialSchema = z.object({
    nombre: z.string().min(2, 'El nombre es requerido'),
    codigo_barras: z.string().optional(),
    categoria: z.string().min(1, 'La categoría es requerida'),
    proveedor_id: z.string().optional(),
    unidad: z.enum(['kg', 'unidad', 'litro']),
    precio_costo: z.coerce.number().min(0, 'El costo no puede ser negativo'),
    stock_actual: z.coerce.number().min(0),
    stock_minimo: z.coerce.number().min(0),
    activo: z.boolean(),
});

type RawMaterialFormValues = z.infer<typeof rawMaterialSchema>;

interface RawMaterialDialogProps {
    product?: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function RawMaterialDialog({ product, open, onOpenChange }: RawMaterialDialogProps) {
    const { tenantId } = useTenant();
    const isEditing = !!product;
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    const form = useForm<RawMaterialFormValues>({
        resolver: zodResolver(rawMaterialSchema) as Resolver<RawMaterialFormValues>,
        defaultValues: {
            nombre: '',
            codigo_barras: '',
            categoria: '',
            proveedor_id: '',
            unidad: 'kg',
            precio_costo: 0,
            stock_actual: 0,
            stock_minimo: 5,
            activo: true,
        },
    });

    // Load Suppliers
    useEffect(() => {
        if (!tenantId || !open) return;

        const loadSuppliers = async () => {
            try {
                const q = query(
                    collection(db, 'suppliers'),
                    where('tenantId', '==', tenantId),
                    where('activo', '==', true)
                );
                const snapshot = await getDocs(q);
                const suppliersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Supplier[];
                setSuppliers(suppliersData);
            } catch (error) {
                console.error("Error loading suppliers", error);
            }
        };

        loadSuppliers();
    }, [tenantId, open]);

    useEffect(() => {
        if (product && open) {
            form.reset({
                nombre: product.nombre,
                codigo_barras: product.codigo_barras || '',
                categoria: product.categoria,
                proveedor_id: product.proveedor_id || '',
                unidad: (product.unidad === 'kg' ? 'kg' : product.unidad === 'litro' ? 'litro' : 'unidad'),
                precio_costo: product.precio_costo || 0,
                stock_actual: product.stock_actual || 0,
                stock_minimo: product.stock_minimo || 0,
                activo: product.activo,
            });
        } else if (!isEditing && open) {
            form.reset({
                nombre: '',
                codigo_barras: '',
                categoria: 'Almacén',
                proveedor_id: '',
                unidad: 'kg',
                precio_costo: 0,
                stock_actual: 0,
                stock_minimo: 5,
                activo: true,
            });
        }
    }, [product, form, open, isEditing]);

    const onSubmit = async (data: RawMaterialFormValues) => {
        setLoading(true);
        try {
            // Map 'litro' to 'unidad' or 'kg' internally if needed, or keep as is if system supports it.
            // For now, let's map 'litro' back to 'unidad' mostly or check types. 
            // Previous types only had 'kg' | 'unidad'. Let's stick to that for now, 
            // effectively treating Litro as Unit unless we update types.
            // Actually, let's cast it to satisfy TS but save the string for display logic if we change types later.
            // Ideally we should update types. For now, strict 'kg' | 'unidad' mapping:

            const dbUnidad = data.unidad === 'kg' ? 'kg' : 'unidad';
            const esPesable = data.unidad === 'kg';

            const finalData = {
                nombre: data.nombre,
                descripcion_corta: `Insumo (${data.unidad})`,
                codigo_barras: data.codigo_barras || `MAT-${Date.now()}`, // Fallback generation
                categoria: data.categoria,
                proveedor_id: data.proveedor_id || undefined,

                // Finance
                precio_costo: data.precio_costo,
                precio_venta: 0, // Not for sale directly usually

                // Stock
                stock_actual: data.stock_actual,
                stock_minimo: data.stock_minimo,
                stock_controlado: true,

                // Units
                unidad: dbUnidad,
                es_pesable: esPesable,

                // System
                tipo: 'materia_prima',
                activo: data.activo,
                disponible: false, // Not for menu

                updated_at: Timestamp.now(),
                slug: data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            };

            const safeData = cleanUndefined(finalData);

            if (isEditing && product) {
                const productRef = doc(db, 'products', product.id);
                // @ts-ignore
                await updateDoc(productRef, safeData);
            } else {
                // @ts-ignore
                await addDoc(collection(db, 'products'), {
                    ...safeData,
                    tenantId: tenantId,
                    created_at: Timestamp.now(),
                });
            }
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving raw material:', error);
            alert('Error al guardar el insumo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 bg-muted/50 border-b border-border">
                    <DialogTitle className="text-2xl font-black text-gold flex items-center gap-3">
                        <Package className="w-6 h-6" />
                        {isEditing ? 'Editar Insumo' : 'Nueva Materia Prima'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                    {/* 1. Identification */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wider">Nombre del Insumo</Label>
                            <Input
                                {...form.register('nombre')}
                                placeholder="Ej: Tela de Algodón, Hilo de Seda, Cuero"
                                className="bg-background border-border focus:border-gold h-11 font-bold"
                            />
                            {form.formState.errors.nombre &&
                                <p className="text-red-500 text-xs">{form.formState.errors.nombre.message}</p>
                            }
                        </div>

                        <div className="space-y-2">
                            <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wider">Categoría</Label>
                            {/* Simple Input for now, could be Creatable Select */}
                            <Input
                                {...form.register('categoria')}
                                placeholder="Ej: Telas, Insumos de Oficina"
                                className="bg-background border-border"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                                <Truck className="w-3 h-3" /> Proveedor
                            </Label>
                            <Select
                                value={form.watch('proveedor_id') || "none"}
                                onValueChange={(val) => form.setValue('proveedor_id', val === "none" ? "" : val)}
                            >
                                <SelectTrigger className="bg-background border-border">
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground">
                                    <SelectItem value="none">-- Sin asignar --</SelectItem>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* 2. Units & Costs */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Label className="text-gold font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                                <Scale className="w-3 h-3" /> Unidad y Medida
                            </Label>

                            <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Tipo de Unidad</Label>
                                    <Select
                                        value={form.watch('unidad')}
                                        onValueChange={(val) => form.setValue('unidad', val as any)}
                                    >
                                        <SelectTrigger className="bg-background border-border">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border text-foreground">
                                            <SelectItem value="kg">Pesable (Kg)</SelectItem>
                                            <SelectItem value="unidad">Unitable (Unidades)</SelectItem>
                                            <SelectItem value="litro">Volumen (Litros)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Código / SKU (Opcional)</Label>
                                    <Input
                                        {...form.register('codigo_barras')}
                                        placeholder="Código de barras"
                                        className="bg-background border-border font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-gold font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                                <DollarSign className="w-3 h-3" /> Costos e Inventario
                            </Label>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Costo de Compra (x Unidad)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            {...form.register('precio_costo')}
                                            className="bg-background border-border pl-6 text-foreground font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Stock Actual</Label>
                                        <Input
                                            type="number"
                                            {...form.register('stock_actual')}
                                            className="bg-background border-border"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-amber-600">Stock Mín.</Label>
                                        <Input
                                            type="number"
                                            {...form.register('stock_minimo')}
                                            className="bg-background border-border text-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={form.watch('activo')}
                                onCheckedChange={(val) => form.setValue('activo', val)}
                            />
                            <Label className="text-xs text-muted-foreground uppercase font-bold">Activo para uso</Label>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="gold"
                                disabled={loading}
                                className="font-bold min-w-[120px]"
                            >
                                {loading ? 'Guardando...' : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
