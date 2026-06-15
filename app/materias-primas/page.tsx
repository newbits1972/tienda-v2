'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, Timestamp, deleteDoc, where, writeBatch, getDocs } from 'firebase/firestore';
import { Package, Plus, Search, Edit, Trash2, TrendingUp, AlertTriangle, Upload, Box } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RawMaterialDialog } from '@/components/inventory/RawMaterialDialog';
import { BulkImportDialog } from '@/components/inventory/BulkImportDialog';
import { PriceUpdateDialog } from '@/components/inventory/PriceUpdateDialog';
import { Product } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';

export default function MateriasPrimasPage() {
    const { user } = useAuth();
    const { tenantId } = useTenant();
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isPriceUpdateOpen, setIsPriceUpdateOpen] = useState(false);

    // Load raw materials in real-time
    useEffect(() => {
        let q;

        if (user?.rol === 'superadmin') {
            q = query(collection(db, 'products'), where('tipo', '==', 'materia_prima'));
        } else {
            if (!tenantId) return;
            q = query(collection(db, 'products'),
                where('tenantId', '==', tenantId),
                where('tipo', '==', 'materia_prima')
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Product[];
            setProducts(productsData);
        });

        return () => unsubscribe();
    }, [tenantId, user?.rol]);

    // Get unique categories
    const categories = Array.from(new Set(products.map(p => p.categoria)));

    // Filter products
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.codigo_barras.includes(searchTerm);
        const matchesCategory = filterCategory === 'all' || product.categoria === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este insumo?')) {
            try {
                await deleteDoc(doc(db, 'products', id));
            } catch (error) {
                console.error('Error deleting material:', error);
                alert('Error al eliminar el insumo');
            }
        }
    };

    // Count low stock items
    const lowStockCount = products.filter(p => p.stock_controlado && p.stock_actual !== undefined && p.stock_actual !== null && p.stock_actual <= p.stock_minimo && p.activo).length;

    return (
        <div className="min-h-screen bg-background p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gold mb-2">Materias Primas</h1>
                <p className="text-muted-foreground">Administra los insumos y materias primas de tu inventario</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Insumos</p>
                                <p className="text-2xl font-bold">{products.length}</p>
                            </div>
                            <Box className="w-8 h-8 text-gold" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Activos</p>
                                <p className="text-2xl font-bold">
                                    {products.filter(p => p.activo).length}
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className={lowStockCount > 0 ? 'border-yellow-500' : ''}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                                <p className="text-2xl font-bold text-yellow-500">{lowStockCount}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Categorías</p>
                                <p className="text-2xl font-bold">{categories.length}</p>
                            </div>
                            <Package className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Actions */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o código..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="h-10 rounded-md border border-input bg-background px-3 py-2"
                        >
                            <option value="all">Todas las categorías</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        {(user?.rol === 'admin' || user?.rol === 'superadmin') && (
                            <>
                                <Button
                                    variant="default"
                                    className="gap-2"
                                    onClick={() => {
                                        setSelectedProduct(null);
                                        setIsDialogOpen(true);
                                    }}
                                >
                                    <Plus className="w-4 h-4" />
                                    Nuevo Insumo
                                </Button>

                                <Button variant="outline" className="gap-2" onClick={() => setIsBulkImportOpen(true)}>
                                    <Upload className="w-4 h-4" />
                                    Carga Masiva
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Insumos ({filteredProducts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-3">Insumo</th>
                                    <th className="text-left p-3">Código</th>
                                    <th className="text-left p-3">Categoría</th>
                                    <th className="text-right p-3">Costo</th>
                                    <th className="text-right p-3">Stock</th>
                                    <th className="text-center p-3">Estado</th>
                                    <th className="text-center p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="border-b hover:bg-accent/50">
                                        <td className="p-3">
                                            <p className="font-bold">{product.nombre}</p>
                                        </td>
                                        <td className="p-3 font-mono text-xs text-zinc-500">{product.codigo_barras}</td>
                                        <td className="p-3">
                                            <Badge variant="outline" className="font-bold border-zinc-800 text-zinc-400">{product.categoria}</Badge>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className="font-bold text-gold">{product.precio_costo ? formatCurrency(product.precio_costo) : '-'}</span>
                                            <span className="text-[10px] text-zinc-600 font-bold uppercase ml-1">/ {product.unidad}</span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`font-bold ${product.stock_controlado && product.stock_actual !== undefined && product.stock_actual !== null && product.stock_actual <= product.stock_minimo ? 'text-red-500' : 'text-zinc-300'}`}>
                                                    {product.stock_actual !== undefined && product.stock_actual !== null ? product.stock_actual : '-'} {product.unidad}
                                                </span>
                                                {product.stock_controlado && product.stock_actual !== undefined && product.stock_actual !== null && product.stock_actual <= product.stock_minimo && (
                                                    <Badge variant="destructive" className="text-[8px] py-0 px-1 mt-1">STOCK BAJO</Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <Badge variant={product.activo ? 'secondary' : 'destructive'}>
                                                {product.activo ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </td>
                                        <td className="p-3">
                                            {(user?.rol === 'admin' || user?.rol === 'superadmin') && (
                                                <div className="flex gap-1 justify-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-zinc-500 hover:text-gold hover:bg-gold/10"
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setIsDialogOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                                                        onClick={() => handleDelete(product.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <RawMaterialDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                product={selectedProduct}
            />

            <BulkImportDialog
                isOpen={isBulkImportOpen}
                onClose={() => setIsBulkImportOpen(false)}
                defaultType="materia_prima"
            />
        </div>
    );
}
