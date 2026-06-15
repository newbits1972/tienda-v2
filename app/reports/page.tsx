'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, Timestamp, where } from 'firebase/firestore';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Package,
    AlertTriangle,
    DollarSign,
    Calendar,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase/config';
import { Sale, Product, Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, Download, Eye } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { SaleDetailsDialog } from '@/components/pos/SaleDetailsDialog';
import { useTenant } from '@/hooks/useTenant';

export default function ReportsPage() {
    const { tenantId } = useTenant();
    const [sales, setSales] = useState<Sale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'month' | 'all'>('today');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        if (!tenantId) return;

        let qSales = query(
            collection(db, 'sales'),
            where('tenantId', '==', tenantId),
            orderBy('fecha', 'desc')
        );

        if (dateRange !== 'all') {
            let startDate = new Date();
            startDate.setHours(0, 0, 0, 0);

            if (dateRange === '7days') startDate = subDays(new Date(), 7);
            if (dateRange === '30days') startDate = subDays(new Date(), 30);
            if (dateRange === 'month') startDate = startOfMonth(new Date());

            qSales = query(
                collection(db, 'sales'),
                where('tenantId', '==', tenantId),
                where('fecha', '>=', Timestamp.fromDate(startDate)),
                orderBy('fecha', 'desc')
            );
        }

        const unsubscribeSales = onSnapshot(qSales, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
            setSales(data);
        });

        const qProducts = query(
            collection(db, 'products'),
            where('tenantId', '==', tenantId)
        );
        const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
        });

        const qCustomers = query(
            collection(db, 'customers'),
            where('tenantId', '==', tenantId)
        );
        const unsubscribeCustomers = onSnapshot(qCustomers, (snapshot) => {
            setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Customer[]);
            setLoading(false);
        });

        return () => {
            unsubscribeSales();
            unsubscribeProducts();
            unsubscribeCustomers();
        };
    }, [dateRange]);

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const lowStockProducts = products.filter(p => p.stock_controlado && p.stock_actual !== undefined && p.stock_actual !== null && p.stock_actual <= p.stock_minimo && p.activo);

    // Calculate revenue for today specifically
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const revenueToday = sales
        .filter(s => s.fecha.toMillis() >= todayStart.getTime())
        .reduce((sum, s) => sum + s.total, 0);

    const exportToCSV = () => {
        const headers = ['ID', 'Fecha', 'Cliente', 'Tipo', 'Pago', 'Total'];
        const csvData = sales.map(s => {
            const cliente = s.cliente_id ? customers.find(c => c.id === s.cliente_id)?.nombre : 'Consumidor Final';
            return [
                s.id,
                format(s.fecha.toDate(), 'dd/MM/yyyy HH:mm'),
                cliente,
                s.tipo_comprobante,
                s.metodo_pago,
                s.total
            ].join(',');
        });

        const csvContent = [headers.join(','), ...csvData].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_ventas_${dateRange}_${format(new Date(), 'yyyyMMdd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Reportes y Estadísticas</h1>
                    <p className="text-muted-foreground">Análisis detallado de tu negocio en DataSense Food</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                        <SelectTrigger className="w-[180px] bg-background border-border">
                            <Calendar className="w-4 h-4 mr-2 text-primary" />
                            <SelectValue placeholder="Rango de fecha" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-foreground">
                            <SelectItem value="today">Hoy</SelectItem>
                            <SelectItem value="7days">Últimos 7 días</SelectItem>
                            <SelectItem value="30days">Últimos 30 días</SelectItem>
                            <SelectItem value="month">Mes Actual</SelectItem>
                            <SelectItem value="all">Todo el Historial</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        className="transition-colors"
                        onClick={exportToCSV}
                        disabled={sales.length === 0}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Ventas Totales</p>
                                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                            </div>
                            <div className="p-2 bg-gold/10 rounded-full">
                                <DollarSign className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Ventas Hoy</p>
                                <p className="text-2xl font-bold text-green-500">{formatCurrency(revenueToday)}</p>
                            </div>
                            <div className="p-2 bg-green-500/10 rounded-full">
                                <TrendingUp className="w-6 h-6 text-green-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Productos</p>
                                <p className="text-2xl font-bold">{products.length}</p>
                            </div>
                            <div className="p-2 bg-blue-500/10 rounded-full">
                                <Package className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Bajo Stock</p>
                                <p className="text-2xl font-bold text-red-500">{lowStockProducts.length}</p>
                            </div>
                            <div className="p-2 bg-red-500/10 rounded-full">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="md:col-span-2 lg:col-span-3 border-border bg-card">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por cliente, documento o ID..."
                                className="pl-10 bg-background border-border text-foreground"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="border-border text-muted-foreground">
                            <Filter className="w-4 h-4 mr-2" />
                            Filtrar
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Daily Trend Table */}
            <div className="space-y-6">
                <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Historial de Ventas ({sales.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-border">Fecha / Hora</th>
                                        <th className="px-4 py-3 border-b border-border">Cliente</th>
                                        <th className="px-4 py-3 border-b border-border">Comprobante</th>
                                        <th className="px-4 py-3 border-b border-border text-right">Total</th>
                                        <th className="px-4 py-3 border-b border-border text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.filter(s => {
                                        const searchLower = searchTerm.toLowerCase();
                                        return s.id.toLowerCase().includes(searchLower) ||
                                            (s.cliente_id && customers.find(c => c.id === s.cliente_id)?.nombre.toLowerCase().includes(searchLower)) ||
                                            s.numero_comprobante?.toLowerCase().includes(searchLower);
                                    }).map((sale) => (
                                        <tr key={sale.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">{format(sale.fecha.toDate(), 'dd/MM/yyyy')}</div>
                                                <div className="text-[10px] text-muted-foreground">{format(sale.fecha.toDate(), 'HH:mm')}hs</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {sale.cliente_id ? (
                                                    <div>
                                                        <div className="text-foreground font-medium">{customers.find(c => c.id === sale.cliente_id)?.nombre}</div>
                                                        <div className="text-[10px] text-muted-foreground uppercase">{sale.metodo_pago.replace('_', ' ')}</div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="text-muted-foreground italic">Consumidor Final</div>
                                                        <div className="text-[10px] text-muted-foreground uppercase">{sale.metodo_pago.replace('_', ' ')}</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 uppercase text-muted-foreground font-mono text-xs">
                                                {sale.tipo_comprobante} <br />
                                                <span className="text-muted-foreground/60">{sale.numero_comprobante || `--`}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-foreground">
                                                {formatCurrency(sale.total)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={() => {
                                                        setSelectedSale(sale);
                                                        setIsDetailsOpen(true);
                                                    }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {sales.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No se encontraron ventas para este periodo.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Low Stock Alert List */}
                    <Card className="lg:col-span-2 border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Alertas de Reposición de Stock
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {lowStockProducts.map((product) => (
                                    <div key={product.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                                        <div>
                                            <p className="font-medium text-foreground">{product.nombre}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Stock actual: <span className="text-red-400 font-bold">{product.stock_actual ?? '-'} {product.es_pesable ? 'kg' : 'un.'}</span>
                                                <span className="mx-2">•</span>
                                                Mínimo: {product.stock_minimo ?? 0} {product.es_pesable ? 'kg' : 'un.'}
                                            </p>
                                        </div>
                                        <Badge variant="destructive">Critico</Badge>
                                    </div>
                                ))}
                                {lowStockProducts.length === 0 && (
                                    <p className="text-sm text-center text-muted-foreground py-4">
                                        Todos los niveles de stock están correctos.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card className="border-primary/20 bg-primary/5 border-dashed">
                        <CardHeader>
                            <CardTitle>Resumen del Periodo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Cant. Operaciones:</span>
                                <span className="font-bold text-foreground">{sales.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-t border-border pt-2">
                                <span className="text-muted-foreground">Promedio Ticket:</span>
                                <span className="font-bold text-foreground">
                                    {sales.length > 0 ? formatCurrency(totalRevenue / sales.length) : '$0.00'}
                                </span>
                            </div>
                            <div className="pt-4 border-t border-border mt-4">
                                <p className="text-xs text-muted-foreground mb-2 uppercase font-bold tracking-wider">Cajeros Activos</p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Ventas Registradas:</span>
                                        <span className="text-primary font-bold">{sales.length} trans.</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <SaleDetailsDialog
                sale={selectedSale}
                customer={selectedSale?.cliente_id ? (customers.find(c => c.id === selectedSale.cliente_id) || null) : null}
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
            />
        </div>
    );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'destructive' }) {
    const bgColor = variant === 'destructive' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-primary/10 text-primary border-primary/20';
    return (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${bgColor}`}>
            {children}
        </span>
    );
}
