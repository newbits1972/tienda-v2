'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { Users, UserPlus, DollarSign, AlertCircle, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { CustomerDetailDialog } from '@/components/customers/CustomerDetailDialog';
import { Customer } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { formatCurrency } from '@/lib/utils';
import { useTenant } from '@/hooks/useTenant';

export default function CustomersPage() {
    const { tenantId } = useTenant();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Load customers in real-time
    useEffect(() => {
        if (!tenantId) return;
        const q = query(collection(db, 'customers'), where('tenantId', '==', tenantId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const customersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Customer[];
            setCustomers(customersData);
        });

        return () => unsubscribe();
    }, []);

    // Filter customers
    const filteredCustomers = customers.filter(customer =>
        customer.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.dni_cuit?.includes(searchTerm) ||
        customer.telefono?.includes(searchTerm)
    );

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
            try {
                await deleteDoc(doc(db, 'customers', id));
            } catch (error) {
                console.error('Error deleting customer:', error);
                alert('Error al eliminar el cliente');
            }
        }
    };

    // Calculate stats
    const totalDebt = customers.reduce((sum, c) => sum + Math.abs(Math.min(0, c.saldo_cuenta_corriente)), 0);
    const customersWithDebt = customers.filter(c => c.saldo_cuenta_corriente < 0).length;

    return (
        <div className="min-h-screen bg-background p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gold mb-2">Gestión de Clientes</h1>
                <p className="text-muted-foreground">Administra clientes y cuentas corrientes</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Clientes</p>
                                <p className="text-2xl font-bold">{customers.length}</p>
                            </div>
                            <Users className="w-8 h-8 text-gold" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Clientes Activos</p>
                                <p className="text-2xl font-bold">
                                    {customers.filter(c => c.activo).length}
                                </p>
                            </div>
                            <Users className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className={customersWithDebt > 0 ? 'border-yellow-500' : ''}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Con Deuda</p>
                                <p className="text-2xl font-bold text-yellow-500">{customersWithDebt}</p>
                            </div>
                            <AlertCircle className="w-8 h-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Deuda Total</p>
                                <p className="text-2xl font-bold text-red-500">
                                    {formatCurrency(totalDebt)}
                                </p>
                            </div>
                            <DollarSign className="w-8 h-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Actions */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <Input
                            placeholder="Buscar por nombre, DNI/CUIT o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1"
                        />
                        <Button
                            variant="default"
                            className="gap-2"
                            onClick={() => {
                                setSelectedCustomer(null);
                                setIsDialogOpen(true);
                            }}
                        >
                            <UserPlus className="w-4 h-4" />
                            Nuevo Cliente
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Customers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Clientes ({filteredCustomers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-3">Cliente</th>
                                    <th className="text-left p-3">DNI/CUIT</th>
                                    <th className="text-left p-3">Contacto</th>
                                    <th className="text-right p-3">Saldo</th>
                                    <th className="text-right p-3">Límite Crédito</th>
                                    <th className="text-center p-3">Estado</th>
                                    <th className="text-center p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="border-b hover:bg-accent/50">
                                        <td className="p-3">
                                            <div>
                                                <p className="font-medium">{customer.nombre}</p>
                                                {customer.direccion && (
                                                    <p className="text-xs text-muted-foreground">{customer.direccion}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 font-mono text-sm">{customer.dni_cuit || '-'}</td>
                                        <td className="p-3">
                                            <div className="text-sm">
                                                {customer.telefono && <p>{customer.telefono}</p>}
                                                {customer.email && (
                                                    <p className="text-muted-foreground">{customer.email}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className={
                                                customer.saldo_cuenta_corriente < 0
                                                    ? 'text-red-500 font-bold'
                                                    : customer.saldo_cuenta_corriente > 0
                                                        ? 'text-green-500 font-bold'
                                                        : ''
                                            }>
                                                {formatCurrency(customer.saldo_cuenta_corriente)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right text-muted-foreground">
                                            {formatCurrency(customer.limite_credito)}
                                        </td>
                                        <td className="p-3 text-center">
                                            <Badge variant={customer.activo ? 'secondary' : 'destructive'}>
                                                {customer.activo ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-2 justify-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-gold hover:text-gold hover:bg-gold/10"
                                                    onClick={() => {
                                                        setSelectedCustomer(customer);
                                                        setIsDetailOpen(true);
                                                    }}
                                                    title="Ver Historial / Cobrar"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSelectedCustomer(customer);
                                                        setIsDialogOpen(true);
                                                    }}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(customer.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <CustomerDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                customer={selectedCustomer}
            />
            <CustomerDetailDialog
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                customer={selectedCustomer}
            />
        </div>
    );
}
