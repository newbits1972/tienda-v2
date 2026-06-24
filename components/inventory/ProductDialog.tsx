'use client';

import React, { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp, collection, addDoc, updateDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
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
import { useTenant } from '@/hooks/useTenant';
import { useImageUpload } from '@/hooks/useImageUpload';
import { cleanUndefined } from '@/lib/utils';
import { Package, ChefHat, Settings2, Image as ImageIcon, Plus, Trash2, Sparkles, Utensils, X, UploadCloud, Loader2, ShoppingBag, Barcode, HelpCircle, Layers, Shirt, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

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
    
    // Auxiliares para variantes por comas
    talles_csv: z.string().optional(),
    colores_csv: z.string().optional(),
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
    const { user } = useAuth();
    const isEditing = !!product;
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    
    // Estados locales para la estructura de variantes
    const [variantes, setVariantes] = useState<any[]>([]); // Compatibilidad extras e-commerce
    const [extras, setExtras] = useState<ProductExtra[]>([]);
    
    // Estados locales para Matriz de Variantes Físicas
    const [physicalVariants, setPhysicalVariants] = useState<ProductVariant[]>([]);
    const [tallesList, setTallesList] = useState<string[]>([]);
    const [coloresList, setColoresList] = useState<{ nombre: string; hex: string }[]>([]);
    const [matrizVariantes, setMatrizVariantes] = useState<any[]>([]);

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
            talles_csv: '',
            colores_csv: '',
        },
    });

    const { uploadImage, uploading, error: uploadError } = useImageUpload();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const path = `products/${tenantId}/${file.name}-${Date.now()}`;
                const result = await uploadImage(file, path);
                form.setValue('imagen_url', result.url);
            } catch (error) {
                console.error("Upload failed", error);
            }
        }
    };

    // 1. Cargar variantes físicas existentes de Firestore
    useEffect(() => {
        const fetchVariants = async () => {
            if (isEditing && product && open && tenantId) {
                try {
                    const q = query(
                        collection(db, 'product_variants'),
                        where('producto_id', '==', product.id),
                        where('activo', '==', true)
                    );
                    const snap = await getDocs(q);
                    const physical = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }) as ProductVariant);
                    setPhysicalVariants(physical);
                } catch (err) {
                    console.error("Error fetching physical variants", err);
                }
            } else {
                setPhysicalVariants([]);
            }
        };
        fetchVariants();
    }, [product, open, isEditing, tenantId]);

    // 2. Escuchar cambios en los inputs de talles y colores en formato barra (/)
    const tallesText = form.watch('talles_csv') || '';
    const coloresText = form.watch('colores_csv') || '';

    useEffect(() => {
        const tallesParsed = tallesText.split('/').map(t => t.trim()).filter(Boolean);
        setTallesList(tallesParsed);
    }, [tallesText]);

    useEffect(() => {
        const coloresParsed = coloresText.split('/').map(c => c.trim()).filter(Boolean).map(c => {
            const pre = product?.colores_disponibles?.find(pc => pc.nombre.toLowerCase() === c.toLowerCase());
            return { nombre: c, hex: pre?.hex || '#cccccc' };
        });
        setColoresList(coloresParsed);
    }, [coloresText, product]);

    // 3. Sincronizar y generar la combinatoria para la grilla de inventario
    useEffect(() => {
        const rows: any[] = [];
        let counter = Date.now() % 1000000000;

        coloresList.forEach(colorObj => {
            tallesList.forEach(talle => {
                // Intentar buscar coincidencia física preexistente
                const preexistente = physicalVariants.find(
                    v => v.color.toLowerCase() === colorObj.nombre.toLowerCase() && v.talle.toString() === talle.toString()
                );

                if (preexistente) {
                    rows.push({
                        id: preexistente.id,
                        talle: preexistente.talle,
                        color: preexistente.color,
                        color_hex: preexistente.color_hex || colorObj.hex || '#cccccc',
                        stock_actual: preexistente.stock_actual || 0,
                        codigo_barras: preexistente.codigo_barras || '',
                        sku: preexistente.sku || '',
                        precio_venta: preexistente.precio_venta,
                    });
                } else {
                    // Autogenerar SKU y código de barras para la nueva fila
                    const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
                        .replace(/[^A-Z0-9]/g, '').slice(0, 3);
                    const productNombre = form.watch('nombre') || '';
                    const productMarca = form.watch('marca') || '';
                    
                    const marcaPart = productMarca ? slug(productMarca) : '';
                    const basePart = slug(productNombre);
                    const colorPart = slug(colorObj.nombre);
                    const tallePart = slug(talle);
                    const sku = [marcaPart || basePart, basePart, colorPart, tallePart].filter(Boolean).join('-').slice(0, 20);

                    // EAN-13
                    const baseNumber = counter++;
                    const padded = `200${String(baseNumber).padStart(9, '0')}`.slice(0, 12);
                    let sum = 0;
                    for (let i = 0; i < 12; i++) {
                        const digit = parseInt(padded[i]);
                        sum += i % 2 === 0 ? digit : digit * 3;
                    }
                    const checkDigit = (10 - (sum % 10)) % 10;
                    const codigoBarras = padded + checkDigit;

                    rows.push({
                        talle,
                        color: colorObj.nombre,
                        color_hex: colorObj.hex,
                        stock_actual: 0,
                        codigo_barras: codigoBarras,
                        sku,
                    });
                }
            });
        });

        setMatrizVariantes(rows);
    }, [tallesList, coloresList, physicalVariants]);

    // Cargar datos al abrir el modal
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
                talles_csv: product.talles_disponibles?.join(' / ') || '',
                colores_csv: product.colores_disponibles?.map(c => c.nombre).join(' / ') || '',
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
                talles_csv: '',
                colores_csv: '',
            });
            setVariantes([]);
            setExtras([]);
        }
        setActiveTab('general');
    }, [product, form, open, isEditing]);

    const onSubmit = async (data: ProductFormValues) => {
        setLoading(true);
        try {
            const tiene_variantes = data.tiene_variantes;
            
            // Sumar el stock de todas las variantes de la matriz
            const totalStockMatriz = matrizVariantes.reduce((sum, v) => sum + (v.stock_actual || 0), 0);

            // Preparar listado estructurado de colores
            const coloresObj = coloresList.map(c => ({ nombre: c.nombre, hex: c.hex || '#cccccc' }));

            const finalData = {
                ...data,
                tipo: product?.tipo || defaultType,
                tenantId: product?.tenantId || tenantId || 'default_store',
                // Si tiene variantes, el stock principal es la suma de los stocks de la matriz
                stock_actual: tiene_variantes ? totalStockMatriz : (data.stock_controlado ? (data.stock_actual ?? 0) : undefined),
                stock_minimo: data.stock_controlado ? (data.stock_minimo ?? 0) : undefined,
                talles_disponibles: tiene_variantes ? tallesList : [],
                colores_disponibles: tiene_variantes ? coloresObj : [],
                variantes,
                extras,
                updated_at: Timestamp.now(),
                slug: data.slug || data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
            };

            // Eliminar auxiliares del formulario
            delete (finalData as any).talles_csv;
            delete (finalData as any).colores_csv;

            const safeData = cleanUndefined(finalData);

            let productId = product?.id || '';

            if (isEditing && product) {
                const productRef = doc(db, 'products', product.id);
                await updateDoc(productRef, safeData);
            } else {
                const productRef = await addDoc(collection(db, 'products'), {
                    ...safeData,
                    tenantId: tenantId,
                    created_at: Timestamp.now(),
                });
                productId = productRef.id;
            }

            // Sincronizar variantes físicas en Firestore
            if (tiene_variantes && productId) {
                const batch = writeBatch(db);
                const variantsCollectionRef = collection(db, 'product_variants');

                // 1. Crear o actualizar cada variante de la matriz
                matrizVariantes.forEach(row => {
                    const variantData = {
                        tenantId: product?.tenantId || tenantId || 'default_store',
                        producto_id: productId,
                        producto_nombre: data.nombre,
                        talle: row.talle,
                        color: row.color,
                        color_hex: row.color_hex || '#cccccc',
                        sku: row.sku,
                        codigo_barras: row.codigo_barras,
                        stock_actual: row.stock_actual || 0,
                        stock_minimo: 0,
                        stock_by_branch: {
                            [user?.branch_id || 'default_branch']: row.stock_actual || 0
                        },
                        precio_venta: row.precio_venta || null,
                        activo: true,
                        updated_at: Timestamp.now(),
                    };

                    if (row.id) {
                        const vRef = doc(db, 'product_variants', row.id);
                        batch.update(vRef, cleanUndefined(variantData));
                    } else {
                        const vRef = doc(variantsCollectionRef);
                        batch.set(vRef, {
                            ...cleanUndefined(variantData),
                            created_at: Timestamp.now(),
                        });
                    }
                });

                // 2. Desactivar en base de datos las variantes que ya no están en la matriz
                physicalVariants.forEach(pv => {
                    const todaviaExiste = matrizVariantes.some(row => row.id === pv.id);
                    if (!todaviaExiste) {
                        const vRef = doc(db, 'product_variants', pv.id);
                        batch.update(vRef, {
                            activo: false,
                            updated_at: Timestamp.now()
                        });
                    }
                });

                await batch.commit();
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
            <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden max-h-[90vh] flex flex-col bg-card border border-border rounded-3xl shadow-2xl">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        {(product?.tipo === 'materia_prima' || defaultType === 'materia_prima') ? <Package className="w-6 h-6 text-primary" /> : <ShoppingBag className="w-6 h-6 text-primary" />}
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
                                                    className="text-xl font-black text-foreground"
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
                                            {!form.watch('tiene_variantes') && (
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-bold">Controlar Stock</Label>
                                                    <Switch
                                                        checked={form.watch('stock_controlado')}
                                                        onCheckedChange={(val) => form.setValue('stock_controlado', val)}
                                                    />
                                                </div>
                                            )}

                                            {/* Campos de stock numérico (solo si no tiene variantes y controla stock) */}
                                            {form.watch('stock_controlado') && !form.watch('tiene_variantes') && (
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

                                            {form.watch('tiene_variantes') && (
                                                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-xs text-primary font-medium">
                                                    El stock de este producto se calcula automáticamente sumando el stock de cada una de sus variantes físicas.
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
                                        <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Talle / Medida Principal</Label>
                                        <Input
                                            {...form.register('talle')}
                                            placeholder="Ej: XL, 42, 10m"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Color Principal</Label>
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

                            <TabsContent value="variantes" className="space-y-6 mt-0">
                                {/* Switch Principal para Matriz Física */}
                                <div className="flex items-center justify-between bg-muted/40 p-4 rounded-2xl border border-border">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold text-foreground">¿Este producto tiene múltiples Variantes?</Label>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Habilitar matriz de talles y colores con stock independiente</p>
                                    </div>
                                    <Switch
                                        checked={form.watch('tiene_variantes')}
                                        onCheckedChange={(val) => form.setValue('tiene_variantes', val)}
                                    />
                                </div>

                                {form.watch('tiene_variantes') ? (
                                    /* MATRIZ DE VARIANTES FÍSICAS */
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/80">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Talles Disponibles</Label>
                                                <Input
                                                    {...form.register('talles_csv')}
                                                    placeholder="Ej: 38 / 39 / 40 / 41 / 42"
                                                    className="h-10"
                                                />
                                                <p className="text-[9px] text-muted-foreground">Ingresa las opciones separadas por barra (/) para generar los talles.</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Colores Disponibles</Label>
                                                <Input
                                                    {...form.register('colores_csv')}
                                                    placeholder="Ej: Blanco / Negro / Azul"
                                                    className="h-10"
                                                />
                                                <p className="text-[9px] text-muted-foreground">Ingresa los colores separados por barra (/) para generar la matriz.</p>
                                            </div>
                                        </div>

                                        {/* Tabla de Matriz de Inventario */}
                                        {matrizVariantes.length > 0 ? (
                                            <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-inner">
                                                <div className="bg-muted/40 px-4 py-3 border-b border-border flex justify-between items-center">
                                                    <div>
                                                        <h5 className="font-bold text-sm text-foreground">Inventario por Variante</h5>
                                                        <p className="text-[10px] text-muted-foreground font-medium">Configura el stock y códigos de barra de cada combinación</p>
                                                    </div>
                                                    <Badge variant="outline" className="bg-primary/5 text-primary text-[10px] font-bold">
                                                        {matrizVariantes.length} Combinaciones
                                                    </Badge>
                                                </div>
                                                <div className="overflow-x-auto max-h-[280px]">
                                                    <table className="w-full text-xs text-left">
                                                        <thead className="bg-muted/20 text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                                                            <tr>
                                                                <th className="px-4 py-2.5">Combinación</th>
                                                                <th className="px-4 py-2.5 w-24 text-right">Stock Actual</th>
                                                                <th className="px-4 py-2.5 w-40">Código de Barras</th>
                                                                <th className="px-4 py-2.5 w-40">SKU</th>
                                                                <th className="px-4 py-2.5 w-28 text-right">Precio Venta (Opc)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/40">
                                                            {matrizVariantes.map((row, idx) => (
                                                                <tr key={idx} className="hover:bg-muted/5">
                                                                    <td className="px-4 py-2 font-medium flex items-center gap-2">
                                                                        <span className="w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: row.color_hex }} />
                                                                        <span>{row.color} / Talle {row.talle}</span>
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            value={row.stock_actual}
                                                                            onChange={(e) => {
                                                                                const newVal = parseInt(e.target.value) || 0;
                                                                                const newM = [...matrizVariantes];
                                                                                newM[idx].stock_actual = newVal;
                                                                                setMatrizVariantes(newM);
                                                                            }}
                                                                            className="w-16 h-8 text-right font-bold bg-background border border-border rounded-lg px-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-2">
                                                                        <input
                                                                            type="text"
                                                                            value={row.codigo_barras}
                                                                            onChange={(e) => {
                                                                                const newM = [...matrizVariantes];
                                                                                newM[idx].codigo_barras = e.target.value;
                                                                                setMatrizVariantes(newM);
                                                                            }}
                                                                            className="w-full h-8 font-mono bg-background border border-border rounded-lg px-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-2">
                                                                        <input
                                                                            type="text"
                                                                            value={row.sku}
                                                                            onChange={(e) => {
                                                                                const newM = [...matrizVariantes];
                                                                                newM[idx].sku = e.target.value;
                                                                                setMatrizVariantes(newM);
                                                                            }}
                                                                            className="w-full h-8 font-mono bg-background border border-border rounded-lg px-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={row.precio_venta || ''}
                                                                            placeholder="Base"
                                                                            onChange={(e) => {
                                                                                const newVal = parseFloat(e.target.value) || undefined;
                                                                                const newM = [...matrizVariantes];
                                                                                newM[idx].precio_venta = newVal;
                                                                                setMatrizVariantes(newM);
                                                                            }}
                                                                            className="w-20 h-8 text-right bg-background border border-border rounded-lg px-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-8 border border-dashed border-border/80 rounded-2xl text-center text-xs text-muted-foreground bg-muted/5">
                                                Carga talles y colores en los campos de arriba para generar las combinaciones de inventario.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* COMPATIBILIDAD EXTRAS & E-COMMERCE ADICIONALES */
                                    <div className="space-y-8">
                                        <section className="space-y-4">
                                            <div className="flex justify-between items-center bg-muted p-4 rounded-2xl border border-border">
                                                <div>
                                                    <h4 className="font-bold text-primary">Recargos de Variante (Opcional E-commerce)</h4>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Ej: Recargos por talles especiales (ej. talle XXL +$500)</p>
                                                </div>
                                                <Button type="button" variant="outline" size="sm" onClick={addVariant} className="border-primary/20 text-primary hover:bg-primary/10">
                                                    <Plus className="w-4 h-4 mr-2" /> Agregar Recargo
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
                                                                            placeholder="Opción (ej: XXL)"
                                                                            className="w-24 h-8 bg-transparent border-none text-xs font-bold"
                                                                        />
                                                                        <div className="flex items-center gap-1 bg-muted px-2 rounded-lg">
                                                                            <span className="text-[10px] text-muted-foreground font-bold">Recargo:</span>
                                                                            <Input
                                                                                type="number"
                                                                                value={opt.precio_extra}
                                                                                onChange={(e) => {
                                                                                    const newV = [...variantes];
                                                                                    newV[i].opciones[oi].precio_extra = parseFloat(e.target.value);
                                                                                    setVariantes(newV);
                                                                                }}
                                                                                placeholder="+$ 0"
                                                                                className="w-20 h-8 bg-transparent border-none text-primary text-xs font-black text-right outline-none ring-0"
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newV = [...variantes];
                                                                                newV[i].opciones = v.opciones.filter((_: any, idx: number) => idx !== oi);
                                                                                setVariantes(newV);
                                                                            }}
                                                                            className="text-muted-foreground hover:text-red-500"
                                                                        >
                                                                            <X className="w-3.5 h-3.5" />
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
                                                                        newV[i].opciones.push({ nombre: 'Opción', precio_extra: 0 });
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
                                    </div>
                                )}

                                {/* SECCIÓN DE EXTRAS / AGREGADOS */}
                                <section className="space-y-4 pt-4 border-t border-border">
                                    <div className="flex justify-between items-center bg-muted p-4 rounded-2xl border border-border">
                                        <div>
                                            <h4 className="font-bold text-primary">Extras / Agregados (Opcional E-commerce)</h4>
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
                                            onChange={handleImageSelect}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        
                                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <UploadCloud className="w-6 h-6" />
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold">Seleccionar o soltar imagen</p>
                                            <p className="text-xs text-muted-foreground">Soporta PNG, JPG o WEBP de hasta 5MB</p>
                                        </div>
                                        
                                        {uploading && (
                                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                                                <div className="text-center space-y-2">
                                                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                                                    <p className="text-xs font-bold">Subiendo a Cloud Storage...</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {form.watch('imagen_url') && (
                                        <div className="border border-border rounded-3xl p-4 bg-muted/10 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={form.watch('imagen_url')}
                                                    alt="Preview"
                                                    className="w-16 h-16 object-cover rounded-2xl border border-border"
                                                />
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">Imagen del Producto</p>
                                                    <p className="text-[10px] text-muted-foreground truncate max-w-[200px] sm:max-w-[350px]">
                                                        {form.watch('imagen_url')}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => form.setValue('imagen_url', '')}
                                                className="text-muted-foreground hover:text-red-500 rounded-full"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {uploadError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-medium">
                                            Error al subir: {uploadError}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </form>
                    </div>

                    <DialogFooter className="p-6 border-t border-border bg-muted/30">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">
                            Cancelar
                        </Button>
                        <Button type="submit" form="product-form" disabled={loading || uploading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isEditing ? 'Guardar Cambios' : 'Alta de Producto'}
                        </Button>
                    </DialogFooter>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
