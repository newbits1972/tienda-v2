'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Sale, PaymentMethod } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, CreditCard } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { formatCurrency, toDate } from '@/lib/utils';
import { startOfDay, endOfDay, subDays, format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface DailySales {
    date: string;
    total: number;
    count: number;
}

interface ProductRank {
    nombre: string;
    cantidad: number;
    revenue: number;
}

interface PaymentDistribution {
    method: string;
    total: number;
    count: number;
}

export default function AnalyticsPage() {
    const { tenantId } = useTenant();
    const [loading, setLoading] = useState(true);
    const [todaySales, setTodaySales] = useState(0);
    const [weekSales, setWeekSales] = useState(0);
    const [monthSales, setMonthSales] = useState(0);
    const [dailyData, setDailyData] = useState<DailySales[]>([]);
    const [topProducts, setTopProducts] = useState<ProductRank[]>([]);
    const [paymentDistribution, setPaymentDistribution] = useState<PaymentDistribution[]>([]);

    useEffect(() => {
        const loadAnalytics = async () => {
            if (!tenantId) return;

            setLoading(true);
            try {
                const now = new Date();
                const monthStart = startOfMonth(now);
                const monthEnd = endOfMonth(now);

                // Query all sales from this month
                const q = query(
                    collection(db, 'sales'),
                    where('tenantId', '==', tenantId),
                    where('fecha', '>=', Timestamp.fromDate(monthStart)),
                    where('fecha', '<=', Timestamp.fromDate(monthEnd))
                );

                const snapshot = await getDocs(q);
                const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));

                // Calculate KPIs
                const today = startOfDay(now);
                const weekAgo = subDays(now, 7);

                const todayTotal = sales
                    .filter(s => toDate(s.fecha) >= today)
                    .reduce((sum, s) => sum + s.total, 0);

                const weekTotal = sales
                    .filter(s => toDate(s.fecha) >= weekAgo)
                    .reduce((sum, s) => sum + s.total, 0);

                const monthTotal = sales.reduce((sum, s) => sum + s.total, 0);

                setTodaySales(todayTotal);
                setWeekSales(weekTotal);
                setMonthSales(monthTotal);

                // Daily sales for chart (last 30 days)
                const dailyMap = new Map<string, { total: number; count: number }>();
                for (let i = 29; i >= 0; i--) {
                    const date = subDays(now, i);
                    const dateStr = format(date, 'dd/MM');
                    dailyMap.set(dateStr, { total: 0, count: 0 });
                }

                sales.forEach(sale => {
                    const dateStr = format(toDate(sale.fecha), 'dd/MM');
                    if (dailyMap.has(dateStr)) {
                        const data = dailyMap.get(dateStr)!;
                        data.total += sale.total;
                        data.count += 1;
                    }
                });

                const dailyChartData: DailySales[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
                    date,
                    total: data.total,
                    count: data.count
                }));

                setDailyData(dailyChartData);

                // Top products
                const productMap = new Map<string, { cantidad: number; revenue: number }>();
                sales.forEach(sale => {
                    sale.items.forEach(item => {
                        const key = item.producto.nombre;
                        if (!productMap.has(key)) {
                            productMap.set(key, { cantidad: 0, revenue: 0 });
                        }
                        const data = productMap.get(key)!;
                        data.cantidad += item.cantidad;
                        data.revenue += item.subtotal;
                    });
                });

                const topProductsData: ProductRank[] = Array.from(productMap.entries())
                    .map(([nombre, data]) => ({ nombre, ...data }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 10);

                setTopProducts(topProductsData);

                // Payment distribution
                const paymentMap = new Map<PaymentMethod, { total: number; count: number }>();
                sales.forEach(sale => {
                    if (!paymentMap.has(sale.metodo_pago)) {
                        paymentMap.set(sale.metodo_pago, { total: 0, count: 0 });
                    }
                    const data = paymentMap.get(sale.metodo_pago)!;
                    data.total += sale.total;
                    data.count += 1;
                });

                const paymentLabels: Record<PaymentMethod, string> = {
                    efectivo: 'Efectivo',
                    tarjeta_debito: 'Débito',
                    tarjeta_credito: 'Crédito',
                    transferencia: 'Transferencia',
                    cuenta_corriente: 'Cuenta Corriente',
                    mercado_pago: 'Mercado Pago'
                };

                const paymentData: PaymentDistribution[] = Array.from(paymentMap.entries()).map(([method, data]) => ({
                    method: paymentLabels[method],
                    total: data.total,
                    count: data.count
                }));

                setPaymentDistribution(paymentData);

            } catch (error) {
                console.error('Error loading analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        loadAnalytics();
    }, [tenantId]);

    const COLORS = ['#D4AF37', '#FFD700', '#FFA500', '#FF8C00', '#FF6347', '#DC143C'];

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando analytics...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gold flex items-center gap-3">
                    <BarChart3 className="w-8 h-8" />
                    Dashboard de Métricas
                </h1>
                <p className="text-muted-foreground">Análisis de ventas y tendencias</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-gold/20 to-gold/5 border-gold/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gold uppercase font-bold">Ventas Hoy</p>
                                <p className="text-3xl font-bold text-gold">{formatCurrency(todaySales)}</p>
                            </div>
                            <DollarSign className="w-12 h-12 text-gold/40" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Últimos 7 Días</p>
                                <p className="text-3xl font-bold">{formatCurrency(weekSales)}</p>
                            </div>
                            <TrendingUp className="w-12 h-12 text-emerald-500/40" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Este Mes</p>
                                <p className="text-3xl font-bold">{formatCurrency(monthSales)}</p>
                            </div>
                            <ShoppingCart className="w-12 h-12 text-blue-500/40" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Trend */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle>Tendencia de Ventas (Últimos 30 Días)</CardTitle>
                        <CardDescription>Revenue diario</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
                                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                                    labelStyle={{ color: '#D4AF37' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Line type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={2} dot={{ fill: '#D4AF37' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Payment Distribution */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle>Distribución de Pagos</CardTitle>
                        <CardDescription>Por método de pago</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={paymentDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="total"
                                >
                                    {paymentDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Top Products */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle>Top 10 Productos Más Vendidos</CardTitle>
                    <CardDescription>Ranking del mes actual</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={topProducts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
                            <YAxis dataKey="nombre" type="category" width={150} stroke="hsl(var(--muted-foreground))" style={{ fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                                formatter={(value: number, name: string) => {
                                    if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                                    return [value, 'Cantidad'];
                                }}
                            />
                            <Bar dataKey="revenue" fill="#D4AF37" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
