'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { ShoppingBag, ChevronRight, Calendar, User, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase/config';
import { Sale, Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { SaleDetailsDialog } from '@/components/pos/SaleDetailsDialog';
import { useTenant } from '@/hooks/useTenant';
import { toDate } from '@/lib/utils';

export default function SalesHistoryPage() {
    const { tenantId } = useTenant();
    const [sales, setSales] = useState<Sale[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        if (!tenantId) return;

        const qSales = query(
            collection(db, 'sales'),
            where('tenantId', '==', tenantId),
            orderBy('fecha', 'desc'),
            limit(50)
        );
        const unsubscribeSales = onSnapshot(qSales, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
            setSales(data);
            setLoading(false);
        });

        const qCustomers = query(
            collection(db, 'customers'),
            where('tenantId', '==', tenantId)
        );
        const unsubscribeCustomers = onSnapshot(qCustomers, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Customer[];
            setCustomers(data);
        });

        return () => {
            unsubscribeSales();
            unsubscribeCustomers();
        };
    }, []);

    const getCustomerName = (id?: string) => {
        if (!id) return 'Consumidor Final';
        const customer = customers.find(c => c.id === id);
        return customer ? customer.nombre : 'Cliente Desconocido';
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Historial de Ventas</h1>
                <p className="text-muted-foreground">Listado de las últimas 50 ventas realizadas</p>
            </div>

            <div className="space-y-4">
                {sales.map((sale) => (
                    <Card key={sale.id} className="hover:border-primary transition-colors cursor-pointer">
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center text-primary">
                                        <ShoppingBag className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-lg">{formatCurrency(sale.total)}</p>
                                            <Badge variant="secondary" className="capitalize">
                                                {sale.metodo_pago.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {toDate(sale.fecha).toLocaleString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {getCustomerName(sale.cliente_id)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1"
                                        onClick={() => {
                                            setSelectedSale(sale);
                                            setIsDetailsOpen(true);
                                        }}
                                    >
                                        Detalles
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {sales.length === 0 && !loading && (
                    <div className="text-center py-20 px-4">
                        <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-medium text-muted-foreground">No se registraron ventas aún</h3>
                    </div>
                )}
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
