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
import { Customer } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useTenant } from '@/hooks/useTenant';

const customerSchema = z.object({
    nombre: z.string().min(2, 'El nombre es requerido'),
    dni_cuit: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    direccion: z.string().optional(),
    saldo_cuenta_corriente: z.number(),
    limite_credito: z.number().min(0),
    activo: z.boolean(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerDialogProps {
    customer?: Customer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CustomerDialog({ customer, open, onOpenChange }: CustomerDialogProps) {
    const { tenantId } = useTenant();
    const isEditing = !!customer;
    const [loading, setLoading] = useState(false);

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema) as Resolver<CustomerFormValues>,
        defaultValues: {
            nombre: '',
            dni_cuit: '',
            telefono: '',
            email: '',
            direccion: '',
            saldo_cuenta_corriente: 0,
            limite_credito: 0,
            activo: true,
        },
    });

    useEffect(() => {
        if (customer) {
            form.reset({
                nombre: customer.nombre,
                dni_cuit: customer.dni_cuit || '',
                telefono: customer.telefono || '',
                email: customer.email || '',
                direccion: customer.direccion || '',
                saldo_cuenta_corriente: customer.saldo_cuenta_corriente,
                limite_credito: customer.limite_credito,
                activo: customer.activo,
            });
        } else {
            form.reset({
                nombre: '',
                dni_cuit: '',
                telefono: '',
                email: '',
                direccion: '',
                saldo_cuenta_corriente: 0,
                limite_credito: 0,
                activo: true,
            });
        }
    }, [customer, form]);

    const onSubmit = async (data: CustomerFormValues) => {
        setLoading(true);
        try {
            if (isEditing && customer) {
                const customerRef = doc(db, 'customers', customer.id);
                await updateDoc(customerRef, {
                    ...data,
                    updated_at: Timestamp.now(),
                });
            } else {
                await addDoc(collection(db, 'customers'), {
                    ...data,
                    tenantId: tenantId,
                    created_at: Timestamp.now(),
                    updated_at: Timestamp.now(),
                });
            }
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error('Error saving customer:', error);
            alert('Error al guardar el cliente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="nombre">Nombre Completo / Razón Social</Label>
                            <Input
                                id="nombre"
                                {...form.register('nombre')}
                                placeholder="Ej: Juan Pérez"
                            />
                            {form.formState.errors.nombre && (
                                <p className="text-sm text-destructive">{form.formState.errors.nombre.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dni_cuit">DNI / CUIT</Label>
                            <Input
                                id="dni_cuit"
                                {...form.register('dni_cuit')}
                                placeholder="20-XXXXXXXX-X"
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
                                placeholder="cliente@ejemplo.com"
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

                        <div className="space-y-2">
                            <Label htmlFor="limite_credito">Límite de Crédito</Label>
                            <Input
                                id="limite_credito"
                                type="number"
                                step="0.01"
                                {...form.register('limite_credito', { valueAsNumber: true })}
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-8">
                            <Switch
                                id="activo"
                                checked={form.watch('activo')}
                                onCheckedChange={(checked) => form.setValue('activo', checked)}
                            />
                            <Label htmlFor="activo">Cliente Activo</Label>
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
                            {loading ? 'Guardando...' : 'Guardar Cliente'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
