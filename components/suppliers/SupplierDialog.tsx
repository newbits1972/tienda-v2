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
import { Supplier } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';

const supplierSchema = z.object({
    nombre: z.string().min(2, 'El nombre es requerido'),
    cuit: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    direccion: z.string().optional(),
    activo: z.boolean(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierDialogProps {
    supplier?: Supplier | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SupplierDialog({ supplier, open, onOpenChange }: SupplierDialogProps) {
    const isEditing = !!supplier;
    const [loading, setLoading] = useState(false);

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema) as Resolver<SupplierFormValues>,
        defaultValues: {
            nombre: '',
            cuit: '',
            telefono: '',
            email: '',
            direccion: '',
            activo: true,
        },
    });

    useEffect(() => {
        if (supplier) {
            form.reset({
                nombre: supplier.nombre,
                cuit: supplier.cuit || '',
                telefono: supplier.telefono || '',
                email: supplier.email || '',
                direccion: supplier.direccion || '',
                activo: supplier.activo,
            });
        } else {
            form.reset({
                nombre: '',
                cuit: '',
                telefono: '',
                email: '',
                direccion: '',
                activo: true,
            });
        }
    }, [supplier, form]);

    const onSubmit = async (data: SupplierFormValues) => {
        setLoading(true);
        try {
            if (isEditing && supplier) {
                const supplierRef = doc(db, 'suppliers', supplier.id);
                await updateDoc(supplierRef, {
                    ...data,
                    updated_at: Timestamp.now(),
                });
            } else {
                await addDoc(collection(db, 'suppliers'), {
                    ...data,
                    created_at: Timestamp.now(),
                    updated_at: Timestamp.now(),
                });
            }
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error('Error saving supplier:', error);
            alert('Error al guardar el proveedor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="nombre">Nombre / Razón Social</Label>
                            <Input
                                id="nombre"
                                {...form.register('nombre')}
                                placeholder="Ej: Distribuidora Central"
                            />
                            {form.formState.errors.nombre && (
                                <p className="text-sm text-destructive">{form.formState.errors.nombre.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cuit">CUIT</Label>
                            <Input
                                id="cuit"
                                {...form.register('cuit')}
                                placeholder="30-XXXXXXXX-X"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="telefono">Teléfono</Label>
                            <Input
                                id="telefono"
                                {...form.register('telefono')}
                                placeholder="11 XXXX-XXXX"
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                {...form.register('email')}
                                placeholder="proveedor@ejemplo.com"
                            />
                            {form.formState.errors.email && (
                                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                            )}
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="direccion">Dirección</Label>
                            <Input
                                id="direccion"
                                {...form.register('direccion')}
                                placeholder="Calle 123, Ciudad"
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-4">
                            <Switch
                                id="activo"
                                checked={form.watch('activo')}
                                onCheckedChange={(checked) => form.setValue('activo', checked)}
                            />
                            <Label htmlFor="activo">Proveedor Activo</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" variant="gold" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Proveedor'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
