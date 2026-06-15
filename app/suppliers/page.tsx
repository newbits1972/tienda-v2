'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';
import { Building2, Plus, Edit, Trash2, Search, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SupplierDialog } from '@/components/suppliers/SupplierDialog';
import { Supplier } from '@/lib/types';
import { db } from '@/lib/firebase/config';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Load suppliers in real-time
    useEffect(() => {
        const q = query(collection(db, 'suppliers'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const suppliersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Supplier[];
            setSuppliers(suppliersData);
        });

        return () => unsubscribe();
    }, []);

    // Filter suppliers
    const filteredSuppliers = suppliers.filter(supplier =>
        supplier.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.cuit?.includes(searchTerm) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este proveedor?')) {
            try {
                await deleteDoc(doc(db, 'suppliers', id));
            } catch (error) {
                console.error('Error deleting supplier:', error);
                alert('Error al eliminar el proveedor');
            }
        }
    };

    return (
        <div className="min-h-screen bg-background p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Gestión de Proveedores</h1>
                <p className="text-muted-foreground">Administra tus proveedores de mercadería</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Proveedores</p>
                                <p className="text-2xl font-bold">{suppliers.length}</p>
                            </div>
                            <Building2 className="w-8 h-8 text-gold" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Activos</p>
                                <p className="text-2xl font-bold text-green-500">
                                    {suppliers.filter(s => s.activo).length}
                                </p>
                            </div>
                            <Building2 className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Inactivos</p>
                                <p className="text-2xl font-bold text-muted-foreground">
                                    {suppliers.filter(s => !s.activo).length}
                                </p>
                            </div>
                            <Building2 className="w-8 h-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Actions */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, CUIT o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button
                            variant="default"
                            className="gap-2"
                            onClick={() => {
                                setSelectedSupplier(null);
                                setIsDialogOpen(true);
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Proveedor
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Suppliers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Proveedores ({filteredSuppliers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-3">Proveedor</th>
                                    <th className="text-left p-3">CUIT</th>
                                    <th className="text-left p-3">Contacto</th>
                                    <th className="text-center p-3">Estado</th>
                                    <th className="text-center p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.map((supplier) => (
                                    <tr key={supplier.id} className="border-b hover:bg-accent/50">
                                        <td className="p-3">
                                            <div>
                                                <p className="font-medium">{supplier.nombre}</p>
                                                {supplier.direccion && (
                                                    <p className="text-xs text-muted-foreground">{supplier.direccion}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 font-mono text-sm">{supplier.cuit || '-'}</td>
                                        <td className="p-3">
                                            <div className="text-sm space-y-1">
                                                {supplier.email && (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-3 h-3 text-muted-foreground" />
                                                        <span>{supplier.email}</span>
                                                    </div>
                                                )}
                                                {supplier.telefono && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3 h-3 text-muted-foreground" />
                                                        <span>{supplier.telefono}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <Badge variant={supplier.activo ? 'secondary' : 'destructive'}>
                                                {supplier.activo ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-2 justify-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSelectedSupplier(supplier);
                                                        setIsDialogOpen(true);
                                                    }}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(supplier.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSuppliers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            No se encontraron proveedores.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <SupplierDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                supplier={selectedSupplier}
            />
        </div>
    );
}
