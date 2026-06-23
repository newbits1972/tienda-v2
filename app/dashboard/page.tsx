'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Package, AlertTriangle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/contexts/AuthContext';
import { Sale, Product } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { formatCurrency, toDate } from '@/lib/utils';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardPage() {
    const { tenantId } = useTenant();
    const { user } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLowStockDialogOpen, setIsLowStockDialogOpen] = useState(false);

    // Load sales from last 7 days
    useEffect(() => {
        if (!tenantId) return;
        const sevenDaysAgo = Timestamp.fromDate(subDays(new Date(), 7));
        const q = query(
            collection(db, 'sales'),
            where('tenantId', '==', tenantId),
            where('fecha', '>=', sevenDaysAgo)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const salesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Sale[];
            setSales(salesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Load products
    useEffect(() => {
        if (!tenantId) return;
        const q = query(
            collection(db, 'products'),
            where('tenantId', '==', tenantId)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Product[];
            setProducts(productsData);
        });

        return () => unsubscribe();
    }, []);

    // Calculate today's sales
    const todaySales = sales.filter(sale => {
        const saleDate = toDate(sale.fecha);
        const today = new Date();
        return (
            saleDate.getDate() === today.getDate() &&
            saleDate.getMonth() === today.getMonth() &&
            saleDate.getFullYear() === today.getFullYear()
        );
    });

    const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const todayCount = todaySales.length;

    // Calculate weekly sales data
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const daySales = sales.filter(sale => {
            const saleDate = toDate(sale.fecha);
            return (
                saleDate.getDate() === date.getDate() &&
                saleDate.getMonth() === date.getMonth() &&
                saleDate.getFullYear() === date.getFullYear()
            );
        });

        weeklyData.push({
            date: format(date, 'EEE', { locale: es }),
            total: daySales.reduce((sum, sale) => sum + sale.total, 0),
            count: daySales.length,
        });
    }

    // Calculate top products
    const productSales: { [key: string]: { product: Product; quantity: number; revenue: number } } = {};

    sales.forEach(sale => {
        sale.items.forEach(item => {
            const productId = item.producto.id;
            if (!productSales[productId]) {
                productSales[productId] = {
                    product: item.producto,
                    quantity: 0,
                    revenue: 0,
                };
            }
            productSales[productId].quantity += item.cantidad;
            productSales[productId].revenue += item.subtotal;
        });
    });

    const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    const lowStockProducts = products.filter(p => p.stock_controlado && p.stock_actual !== undefined && p.stock_actual !== null && p.stock_actual <= p.stock_minimo && p.activo);

    return (
        <div className="min-h-screen bg-background p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-primary mb-2">DataSense Tienda</h1>
                </div>
                <Button
                    variant="gold"
                    className="shadow-lg hover:scale-105 transition-transform"
                    onClick={() => window.location.href = '/marketing/social'}
                >
                    <Sparkles className="w-4 h-4 mr-2" /> Crear Promo para Redes
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Ventas Hoy</p>
                                <p className="text-2xl font-bold text-primary">{formatCurrency(todayTotal)}</p>
                            </div>
                            <DollarSign className="w-8 h-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Transacciones Hoy</p>
                                <p className="text-2xl font-bold">{todayCount}</p>
                            </div>
                            <ShoppingCart className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                                <p className="text-2xl font-bold">
                                    {todayCount > 0 ? formatCurrency(todayTotal / todayCount) : '$0'}
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Productos</p>
                                <p className="text-2xl font-bold">{products.length}</p>
                            </div>
                            <Package className="w-8 h-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={`cursor-pointer transition-all hover:scale-105 ${lowStockProducts.length > 0 ? 'border-red-500 bg-red-500/5' : ''}`}
                    onClick={() => lowStockProducts.length > 0 && setIsLowStockDialogOpen(true)}
                >
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                                <p className={`text-2xl font-bold ${lowStockProducts.length > 0 ? 'text-red-500' : ''}`}>
                                    {lowStockProducts.length}
                                </p>
                            </div>
                            <AlertTriangle className={`w-8 h-8 ${lowStockProducts.length > 0 ? 'text-red-500' : 'text-muted-foreground opacity-20'}`} />
                        </div>
                        {lowStockProducts.length > 0 && (
                            <p className="text-[10px] text-red-400 mt-2 font-bold animate-pulse">Hacé click para ver detalles →</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Weekly Sales Chart */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Ventas de la Semana</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                itemStyle={{ color: 'hsl(var(--primary))' }}
                                labelStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Bar dataKey="total" fill="hsl(var(--primary))" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
                <CardHeader>
                    <CardTitle>Top 10 Productos Más Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {topProducts.map((item, index) => (
                            <div
                                key={item.product.id}
                                className="flex items-center justify-between p-3 bg-accent/20 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium">{item.product.nombre}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {item.quantity} un.
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-primary">{formatCurrency(item.revenue)}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatCurrency(item.revenue / item.quantity)}/un.
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
            {/* Low Stock Dialog */}
            <Dialog open={isLowStockDialogOpen} onOpenChange={setIsLowStockDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-500">
                            <AlertTriangle className="w-5 h-5" />
                            Productos con Stock Bajo
                        </DialogTitle>
                        <DialogDescription>
                            Los siguientes productos han alcanzado o superado el nivel mínimo de reposición.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {lowStockProducts.map(product => (
                            <div key={product.id} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                                <div>
                                    <p className="font-medium">{product.nombre}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Stock actual: <span className="text-red-400 font-bold">{product.stock_actual ?? '-'}</span> un.
                                        <span className="mx-2">•</span>
                                        Mínimo: {product.stock_minimo ?? 0} un.
                                    </p>
                                </div>
                                <Badge variant="destructive" className="bg-red-500/20 text-red-500 border-red-500/20">Crítico</Badge>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button variant="outline" onClick={() => setIsLowStockDialogOpen(false)}>
                            Cerrar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
