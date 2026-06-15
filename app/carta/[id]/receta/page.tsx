'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product, RecipeIngredient } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Plus, Trash2, Save, ArrowLeft, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useTenant } from '@/hooks/useTenant';

export default function RecetaPage() {
    const params = useParams();
    const router = useRouter();
    const { tenantId } = useTenant();
    const productId = params?.id as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [rawMaterials, setRawMaterials] = useState<Product[]>([]);
    const [receta, setReceta] = useState<RecipeIngredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!tenantId || !productId) return;

            try {
                // Load product
                const productDoc = await getDoc(doc(db, 'products', productId));
                if (productDoc.exists()) {
                    const productData = { id: productDoc.id, ...productDoc.data() } as Product;
                    setProduct(productData);
                    setReceta(productData.receta || []);
                } else {
                    toast.error('Producto no encontrado');
                    router.push('/carta');
                    return;
                }

                // Load raw materials
                const q = query(
                    collection(db, 'products'),
                    where('tenantId', '==', tenantId),
                    where('tipo', '==', 'materia_prima'),
                    where('activo', '==', true)
                );
                const snapshot = await getDocs(q);
                setRawMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
            } catch (error) {
                console.error('Error loading data:', error);
                toast.error('Error al cargar datos');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [tenantId, productId, router]);

    const addIngredient = (rawMaterial: Product) => {
        // Check if already added
        if (receta.some(r => r.materia_prima_id === rawMaterial.id)) {
            toast.error('Este ingrediente ya está en la receta');
            return;
        }

        const newIngredient: RecipeIngredient = {
            materia_prima_id: rawMaterial.id,
            materia_prima_nombre: rawMaterial.nombre,
            cantidad: 0,
            unidad: rawMaterial.unidad
        };

        setReceta([...receta, newIngredient]);
    };

    const updateIngredientQuantity = (index: number, cantidad: number) => {
        const updated = [...receta];
        updated[index].cantidad = cantidad;
        setReceta(updated);
    };

    const removeIngredient = (index: number) => {
        setReceta(receta.filter((_, i) => i !== index));
    };

    const calculateProductionCost = (): number => {
        let total = 0;
        receta.forEach(ingredient => {
            const rawMaterial = rawMaterials.find(rm => rm.id === ingredient.materia_prima_id);
            if (rawMaterial) {
                total += ingredient.cantidad * (rawMaterial.precio_costo || 0);
            }
        });
        return total;
    };

    const handleSave = async () => {
        if (!product) return;

        // Validate
        if (receta.some(r => r.cantidad <= 0)) {
            toast.error('Todas las cantidades deben ser mayores a 0');
            return;
        }

        setSaving(true);
        try {
            const productionCost = calculateProductionCost();
            await updateDoc(doc(db, 'products', productId), {
                receta,
                costo_produccion_calculado: productionCost,
                updated_at: Timestamp.now()
            });

            toast.success('Receta guardada correctamente');
            router.push('/carta');
        } catch (error) {
            console.error('Error saving recipe:', error);
            toast.error('Error al guardar la receta');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Cargando receta...</div>;
    }

    if (!product) {
        return null;
    }

    const productionCost = calculateProductionCost();
    const margin = product.precio_venta - productionCost;
    const marginPercentage = product.precio_venta > 0 ? (margin / product.precio_venta) * 100 : 0;

    return (
        <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/carta')}
                        className="mb-2 text-zinc-500 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a la Carta
                    </Button>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ChefHat className="w-8 h-8 text-gold" />
                        Receta: {product.nombre}
                    </h1>
                    <p className="text-zinc-500">Define qué materias primas se necesitan para este plato</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving || receta.length === 0}
                    className="bg-gold hover:bg-yellow-500 text-black font-bold px-8"
                >
                    {saving ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" />Guardar Receta</>}
                </Button>
            </div>

            {/* Cost Analysis Card */}
            <Card className="bg-gradient-to-br from-gold/10 to-gold/5 border-gold/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gold">
                        <Calculator className="w-5 h-5" />
                        Análisis de Costos
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Costo de Producción</p>
                        <p className="text-2xl font-bold text-gold">{formatCurrency(productionCost)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Precio de Venta</p>
                        <p className="text-2xl font-bold">{formatCurrency(product.precio_venta)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Margen Bruto</p>
                        <p className={`text-2xl font-bold ${margin > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {formatCurrency(margin)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 uppercase font-bold mb-1">% de Ganancia</p>
                        <p className={`text-2xl font-bold ${marginPercentage > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {marginPercentage.toFixed(1)}%
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recipe Ingredients (Left) */}
                <Card className="lg:col-span-2 bg-zinc-950 border-zinc-800">
                    <CardHeader>
                        <CardTitle>Ingredientes de la Receta</CardTitle>
                        <CardDescription>
                            {receta.length === 0 ? 'Agrega ingredientes desde el panel lateral' : `${receta.length} ingrediente(s) agregado(s)`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {receta.length === 0 ? (
                            <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                                <ChefHat className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                <p className="text-zinc-500">Esta receta aún no tiene ingredientes</p>
                                <p className="text-zinc-600 text-sm">Selecciona materias primas del panel derecho para comenzar</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {receta.map((ingredient, index) => {
                                    const rawMaterial = rawMaterials.find(rm => rm.id === ingredient.materia_prima_id);
                                    const cost = rawMaterial ? ingredient.cantidad * (rawMaterial.precio_costo || 0) : 0;

                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800"
                                        >
                                            <div className="flex-1">
                                                <p className="font-bold text-white">{ingredient.materia_prima_nombre}</p>
                                                <p className="text-xs text-zinc-500">Costo unitario: {formatCurrency(rawMaterial?.precio_costo || 0)}/{ingredient.unidad}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={ingredient.cantidad || ''}
                                                    onChange={(e) => updateIngredientQuantity(index, parseFloat(e.target.value) || 0)}
                                                    className="w-24 text-center bg-zinc-800 border-zinc-700"
                                                    placeholder="0"
                                                />
                                                <span className="text-sm text-zinc-400 w-16">{ingredient.unidad}</span>
                                            </div>
                                            <div className="w-28 text-right">
                                                <p className="text-sm font-bold text-gold">{formatCurrency(cost)}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeIngredient(index)}
                                                className="text-zinc-500 hover:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Available Raw Materials (Right) */}
                <Card className="bg-zinc-900/30 border-zinc-800 h-fit sticky top-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-gold" />
                            Materias Primas
                        </CardTitle>
                        <CardDescription>Selecciona para agregar a la receta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {rawMaterials.length === 0 ? (
                                <p className="text-center text-zinc-600 py-8 text-sm">
                                    No hay materias primas activas.
                                    <br />
                                    Crea algunas en el módulo de Materias Primas.
                                </p>
                            ) : (
                                rawMaterials.map(rm => {
                                    const isAdded = receta.some(r => r.materia_prima_id === rm.id);
                                    return (
                                        <div
                                            key={rm.id}
                                            className={`p-3 bg-zinc-950 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${isAdded
                                                ? 'border-gold/50 opacity-50'
                                                : 'border-zinc-800 hover:border-gold/30'
                                                }`}
                                            onClick={() => !isAdded && addIngredient(rm)}
                                        >
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white">{rm.nombre}</p>
                                                <p className="text-[10px] text-zinc-500">{rm.categoria}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-gold">{formatCurrency(rm.precio_costo || 0)}</p>
                                                <p className="text-[10px] text-zinc-600">/{rm.unidad}</p>
                                            </div>
                                            {isAdded && (
                                                <Badge variant="outline" className="ml-2 text-[8px] border-gold/20 text-gold">
                                                    Agregado
                                                </Badge>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
