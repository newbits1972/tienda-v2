'use client';

import React, { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp } from 'firebase/firestore';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Product, ProductVariant, ProductExtra } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useTenant } from '@/hooks/useTenant';
import { useImageUpload } from '@/hooks/useImageUpload';
import { cleanUndefined } from '@/lib/utils';
import { Package, ChefHat, Settings2, Image as ImageIcon, Plus, Trash2, Sparkles, Utensils, X, UploadCloud, Loader2, ShoppingBag } from 'lucide-react';

const productSchema = z.object({
    nombre: z.string().min(2, 'El nombre es requerido'),
    descripcion_corta: z.string().optional(),
    codigo_barras: z.string().min(1, 'El código es requerido'),
    categoria: z.string().min(1, 'La categoría es requerida'),
    // Retail Fields
    marca: z.string().optional(),
    talle: z.string().optional(),
    color: z.string().optional(),
    material: z.string().optional(),
    genero: z.string().optional(),
    temporada: z.string().optional(),

    precio_costo: z.coerce.number().min(0).optional().nullable(),
    precio_venta: z.coerce.number().min(0),
    precio_oferta: z.coerce.number().optional().nullable(),
    stock_actual: z.coerce.number().min(0).optional().nullable(),
    stock_minimo: z.coerce.number().min(0).optional(),
    stock_controlado: z.boolean(),
    es_pesable: z.boolean(),
    unidad: z.enum(['kg', 'unidad']),
    activo: z.boolean(),
    disponible: z.boolean(),
    es_destacado: z.boolean().optional(),
    tiene_variantes: z.boolean(),
    slug: z.string().optional(),
    imagen_url: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductDialogProps {
    product?: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultType?: 'producto' | 'materia_prima';
}

export function ProductDialog({ product, open, onOpenChange, defaultType = 'producto' }: ProductDialogProps) {
    const { tenantId } = useTenant();
    const isEditing = !!product;
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    // Local states for complex fields
    const [variantes, setVariantes] = useState<any[]>([]);
    const [extras, setExtras] = useState<ProductExtra[]>([]);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
        defaultValues: {
            nombre: '',
            descripcion_corta: '',
            codigo_barras: '',
            categoria: '',
            marca: '',
            talle: '',
            color: '',
            material: '',
            genero: 'unisex',
            temporada: '',
            precio_costo: null,
            precio_venta: 0,
            precio_oferta: null,
            stock_actual: null,
            stock_minimo: undefined,
            stock_controlado: false,
            es_pesable: false,
            unidad: 'unidad',
            activo: true,
            disponible: true,
            es_destacado: false,
            tiene_variantes: false,
            slug: '',
            imagen_url: '',
        },
    });

    const { uploadImage, uploading, error: uploadError } = useImageUpload();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                // Path structure: products/{tenantId}/{filename}-{timestamp}
                const path = `products/${tenantId}/${file.name}-${Date.now()}`;
                const result = await uploadImage(file, path);
                form.setValue('imagen_url', result.url);
            } catch (error) {
                console.error("Upload failed", error);
            }
        }
    };

    useEffect(() => {
        if (product && open) {
            form.reset({
                nombre: product.nombre,
                descripcion_corta: product.descripcion_corta || '',
                codigo_barras: product.codigo_barras,
                categoria: product.categoria,
                marca: product.marca || '',
                talle: product.talle || '',
                color: product.color || '',
                material: product.material || '',
                genero: product.genero || 'unisex',
                temporada: product.temporada || '',
                precio_costo: product.precio_costo ?? null,
                precio_venta: product.precio_venta ?? 0,
                precio_oferta: product.precio_oferta || null,
                stock_actual: product.stock_actual ?? null,
                stock_minimo: product.stock_minimo ?? 0,
                stock_controlado: product.stock_controlado ?? true,
                es_pesable: product.es_pesable ?? false,
                unidad: (product.unidad === 'kg' ? 'kg' : 'unidad') as 'kg' | 'unidad',
                activo: product.activo ?? true,
                disponible: product.disponible ?? true,
                es_destacado: product.es_destacado ?? false,
                tiene_variantes: product.tiene_variantes || false,
                slug: product.slug || '',
                imagen_url: product.imagen_url || '',
            });
            setVariantes(product.variantes || []);
            setExtras(product.extras || []);
        } else if (!isEditing && open) {
            form.reset({
                nombre: '',
                descripcion_corta: '',
                codigo_barras: '',
                categoria: '',
                marca: '',
                talle: '',
                color: '',
                material: '',
                genero: 'unisex',
                temporada: '',
                precio_costo: null,
                precio_venta: 0,
                precio_oferta: null,
                stock_actual: null,
                stock_minimo: 0,
                stock_controlado: true,
                es_pesable: false,
                unidad: 'unidad',
                activo: true,
                disponible: true,
                es_destacado: false,
                tiene_variantes: false,
                slug: '',
                imagen_url: '',
            });
            setVariantes([]);
            setExtras([]);
        }
        setActiveTab('general');
    }, [product, form, open, isEditing]);

    const onSubmit = async (data: ProductFormValues) => {
        setLoading(true);
        try {
            const finalData = {
                ...data,
                tipo: product?.tipo || defaultType,
                tenantId: product?.tenantId || tenantId || 'default_store',
                // Limpiar stock para productos elaborados
                stock_actual: data.stock_controlado ? data.stock_actual : undefined,
                stock_minimo: data.stock_controlado ? data.stock_minimo : undefined,
                variantes,
                extras,
                updated_at: Timestamp.now(),
                slug: data.slug || data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
            };

            const safeData = cleanUndefined(finalData);

            if (isEditing && product) {
                const productRef = doc(db, 'products', product.id);
                await updateDoc(productRef, safeData);
            } else {
                await addDoc(collection(db, 'products'), {
                    ...safeData,
                    tenantId: tenantId,
                    created_at: Timestamp.now(),
                });
            }
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error al guardar el producto');
        } finally {
            setLoading(false);
        }
    };

    const addVariant = () => {
        setVariantes([...variantes, { nombre: 'Talle', opciones: [{ nombre: 'M', precio_extra: 0 }] }]);
    };

    const removeVariant = (index: number) => {
        setVariantes(variantes.filter((_, i) => i !== index));
    };

    const addExtra = () => {
        setExtras([...extras, { nombre: 'Bolsa Regalo', precio: 0 }]);
    };

    const removeExtra = (index: number) => {
        setExtras(extras.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        {(product?.tipo === 'materia_prima' || defaultType === 'materia_prima') ? <Package className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
                        {isEditing ? 'Editar' : 'Alta de'} {(product?.tipo === 'materia_prima' || defaultType === 'materia_prima') ? 'Insumo / Materia Prima' : 'Producto Tienda'}
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 border-b border-border bg-muted/30">
                        <TabsList className="bg-transparent border-none gap-6 h-14">
                            <TabsTrigger value="general" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 border-primary rounded-none px-0 font-bold uppercase text-[10px] tracking-widest">
                                <Package className="w-4 h-4 mr-2" /> General
                            </TabsTrigger>
                            {(product?.tipo !== 'materia_prima' && defaultType !== 'materia_prima') && (
                                <>
                                    <TabsTrigger value="atributos" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 border-primary rounded-none px-0 font-bold uppercase text-[10px] tracking-widest">
                                        <Settings2 className="w-4 h-4 mr-2" /> Atributos
                                    </TabsTrigger>
                                    <TabsTrigger value="variantes" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 border-primary rounded-none px-0 font-bold uppercase text-[10px] tracking-widest">
                                        <Sparkles className="w-4 h-4 mr-2" /> Variantes & Extras
                                    </TabsTrigger>
                                    <TabsTrigger value="multimedia" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 border-primary rounded-none px-0 font-bold uppercase text-[10px] tracking-widest">
                                        <ImageIcon className="w-4 h-4 mr-2" /> Multimedia
                                    </TabsTrigger>
                                </>
                            )}
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                        <form
                            id="product-form"
                            onSubmit={form.handleSubmit(onSubmit, (errors) => {
                                console.error("Form Validation Errors:", errors);
                                alert("Hay errores en el formulario. Revisa la consola para más detalles.");
                            })}
                            className="space-y-6"
                        >
                            <TabsContent value="general" className="space-y-6 mt-0">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 space-y-2">
                                        <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Nombre del Producto</Label>
                                        <Input
                                            {...form.register('nombre')}
                                            placeholder="Ej: Remera de Algodón"
                                            className="h-12 text-lg font-bold"
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-2">
                                        <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Descripción Corta</Label>
                                        <Textarea
                                            {...form.register('descripcion_corta')}
                                            placeholder="Breve descripción del producto..."
                                            className="min-h-[80px]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Categoría</Label>
                                        <Input
                                            {...form.register('categoria')}
                                            placeholder="Indumentaria, Calzado, etc"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Código / SKU</Label>
                                        <Input
                                            {...form.register('codigo_barras')}
                                            className="font-mono"
                                        />
                                    </div>

                                    <div className="bg-muted/50 p-4 rounded-2xl border border-border space-y-4">
                                        <Label className="text-primary font-black uppercase text-[10px] tracking-[0.2em]">Finanzas</Label>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-muted-foreground uppercase font-bold">Precio Venta</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...form.register('precio_venta')}
                                                    className="text-xl font-black"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-muted-foreground uppercase font-bold">Precio Oferta (Opcional)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...form.register('precio_oferta')}
                                                    className="text-green-500 font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-muted/50 p-4 rounded-2xl border border-border space-y-4">
                                        <Label className="text-muted-foreground font-black uppercase text-[10px] tracking-[0.2em]">Stock & Estado</Label>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-bold">Controlar Stock</Label>
                                                <Switch
                                                    checked={form.watch('stock_controlado')}
                                                    onCheckedChange={(val) => form.setValue('stock_controlado', val)}
                                                />
                                            </div>

                                            {/* Campos de stock numérico (solo para materias primas) */}
                                            {form.watch('stock_controlado') && (
                                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] text-muted-foreground uppercase font-bold">Stock Actual</Label>
                                                        <Input
                                                            type="number"
                                                            {...form.register('stock_actual')}
                                                            className="font-bold"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] text-muted-foreground uppercase font-bold">Stock Mínimo</Label>
                                                        <Input
                                                            type="number"
                                                            {...form.register('stock_minimo')}
                                                            className="text-amber-500 font-bold"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-bold">¿Pesable? (kg)</Label>
                                                <Switch
                                                    checked={form.watch('es_pesable')}
                                                    onCheckedChange={(val) => form.setValue('es_pesable', val)}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-bold text-primary">Producto Destacado</Label>
                                                <Switch
                                                    checked={form.watch('es_destacado')}
                                                    onCheckedChange={(val) => form.setValue('es_destacado', val)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="atributos" className="space-y-6 mt-0">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Marca</Label>
                                        <Input
                                            {...form.register('marca')}
                                            placeholder="Ej: Nike, Adidas, etc"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Talle / Medida</Label>
                                        <Input
                                            {...form.register('talle')}
                                            placeholder="Ej: XL, 42, 10m"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Color</Label>
                                        <Input
                                            {...form.register('color')}
                                            placeholder="Ej: Negro, Azul Francia"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Material</Label>
                                        <Input
                                            {...form.register('material')}
                                            placeholder="Ej: Algodón, Cuero, etc"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Género</Label>
                                        <select
                                            {...form.register('genero')}
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                            <option value="unisex">Unisex</option>
                                            <option value="hombre">Hombre</option>
                                            <option value="mujer">Mujer</option>
                                            <option value="infantil">Infantil</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Temporada</Label>
                                        <Input
                                            {...form.register('temporada')}
                                            placeholder="Ej: Verano 26, Permanente"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="variantes" className="space-y-8 mt-0">
                                <section className="space-y-4">
                                    <div className="flex justify-between items-center bg-muted p-4 rounded-2xl border border-border">
                                        <div>
                                            <h4 className="font-bold text-primary">Variantes del Producto</h4>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Ej: Talle, Color, Modelo</p>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={addVariant} className="border-primary/20 text-primary hover:bg-primary/10">
                                            <Plus className="w-4 h-4 mr-2" /> Agregar Variante
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {variantes.map((v: any, i: number) => (
                                            <div key={i} className="bg-muted/40 p-4 rounded-xl border border-border flex gap-4 items-start">
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        value={v.nombre}
                                                        onChange={(e) => {
                                                            const newV = [...variantes];
                                                            newV[i].nombre = e.target.value;
                                                            setVariantes(newV);
                                                        }}
                                                        placeholder="Nombre (ej: Talle)"
                                                        className="h-10 font-bold"
                                                    />
                                                    <div className="flex flex-wrap gap-2">
                                                        {v.opciones.map((opt: any, oi: number) => (
                                                            <div key={oi} className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border">
                                                                <Input
                                                                    value={opt.nombre}
                                                                    onChange={(e) => {
                                                                        const newV = [...variantes];
                                                                        newV[i].opciones[oi].nombre = e.target.value;
                                                                        setVariantes(newV);
                                                                    }}
                                                                    placeholder="Opción"
                                                                    className="w-24 h-8 bg-transparent border-none text-xs font-bold"
                                                                />
                                                                <Input
                                                                    type="number"
                                                                    value={opt.precio_extra}
                                                                    onChange={(e) => {
                                                                        const newV = [...variantes];
                                                                        newV[i].opciones[oi].precio_extra = parseFloat(e.target.value);
                                                                        setVariantes(newV);
                                                                    }}
                                                                    placeholder="+ $"
                                                                    className="w-20 h-8 bg-muted border-none text-primary text-xs font-black text-right"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newV = [...variantes];
                                                                        newV[i].opciones = v.opciones.filter((_: any, idx: number) => idx !== oi);
                                                                        setVariantes(newV);
                                                                    }}
                                                                    className="text-muted-foreground hover:text-red-500"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2 text-[10px] font-bold text-muted-foreground hover:text-primary"
                                                            onClick={() => {
                                                                const newV = [...variantes];
                                                                newV[i].opciones.push({ nombre: 'Nueva Op.', precio_extra: 0 });
                                                                setVariantes(newV);
                                                            }}
                                                        >
                                                            + Opción
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(i)} className="text-muted-foreground hover:text-red-500 h-10">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex justify-between items-center bg-muted p-4 rounded-2xl border border-border">
                                        <div>
                                            <h4 className="font-bold text-primary">Extras / Agregados</h4>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Ej: Bolsa de regalo, Envoltura especial</p>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={addExtra} className="border-primary/20 text-primary hover:bg-primary/10">
                                            <Plus className="w-4 h-4 mr-2" /> Agregar Extra
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {extras.map((ex, i) => (
                                            <div key={i} className="bg-muted/40 p-4 rounded-xl border border-border flex gap-3 items-center">
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        value={ex.nombre}
                                                        onChange={(e) => {
                                                            const newE = [...extras];
                                                            newE[i].nombre = e.target.value;
                                                            setExtras(newE);
                                                        }}
                                                        placeholder="Extra"
                                                        className="h-9 text-sm font-bold"
                                                    />
                                                    <Input
                                                        type="number"
                                                        value={ex.precio}
                                                        onChange={(e) => {
                                                            const newE = [...extras];
                                                            newE[i].precio = parseFloat(e.target.value);
                                                            setExtras(newE);
                                                        }}
                                                        placeholder="Precio"
                                                        className="h-9 text-primary font-black"
                                                    />
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeExtra(i)} className="text-muted-foreground hover:text-red-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </TabsContent>

                            <TabsContent value="multimedia" className="space-y-6 mt-0">
                                <div className="space-y-6">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-border rounded-3xl p-12 text-center space-y-4 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden group"
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                        />

                                        {form.watch('imagen_url') ? (
                                            <div className="absolute inset-0 bg-card flex items-center justify-center">
                                                <img
                                                    src={form.watch('imagen_url')}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                                    <div className="bg-muted/80 p-3 rounded-full backdrop-blur-sm shadow-xl">
                                                        <Settings2 className="w-6 h-6" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto shadow-2xl relative z-10">
                                                    {uploading ? (
                                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                    ) : (
                                                        <UploadCloud className="w-8 h-8 text-primary/40" />
                                                    )}
                                                </div>
                                                <div className="space-y-1 relative z-10">
                                                    <p className="font-bold">{uploading ? 'Subiendo...' : 'Subir Imagen Principal'}</p>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">
                                                        {uploading ? 'Por favor espere' : 'Click para seleccionar'}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {form.watch('imagen_url') && (
                                        <div className="flex justify-center">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    form.setValue('imagen_url', '');
                                                }}
                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" /> Eliminar Imagen
                                            </Button>
                                        </div>
                                    )}

                                    {uploadError && (
                                        <p className="text-red-500 text-xs text-center font-bold bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                            {uploadError}
                                        </p>
                                    )}

                                    <div className="bg-muted/50 p-6 rounded-3xl border border-border space-y-4">
                                        <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary" /> SEO y Enlaces
                                        </h4>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground font-bold">Slug URL (Personalizable)</Label>
                                            <Input
                                                {...form.register('slug')}
                                                placeholder="remera-algodon-premium"
                                                className="font-mono text-muted-foreground"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </form>
                    </div>

                    <DialogFooter className="p-6 bg-muted/50 border-t border-border">
                        <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={form.watch('activo')}
                                        onCheckedChange={(val) => form.setValue('activo', val)}
                                    />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground">Publicado</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={form.watch('disponible')}
                                        onCheckedChange={(val) => form.setValue('disponible', val)}
                                    />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground">Disponible</span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => onOpenChange(false)}
                                    className="font-black uppercase text-[10px] text-muted-foreground"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    form="product-form"
                                    variant="default"
                                    disabled={loading}
                                    className="px-10 h-12 shadow-2xl font-black uppercase tracking-widest"
                                >
                                    {loading ? 'Procesando...' : (isEditing ? 'Actualizar' : 'Guardar y Publicar')}
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
