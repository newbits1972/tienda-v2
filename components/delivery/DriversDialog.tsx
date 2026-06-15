'use client';

import React, { useState, useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DeliveryDriver } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useTenant } from '@/hooks/useTenant';
import { Bike, Car, User, Phone, Save } from 'lucide-react';

const driverSchema = z.object({
    nombre: z.string().min(2, 'El nombre es requerido'),
    telefono: z.string().min(6, 'El teléfono es requerido'),
    vehiculo: z.enum(['moto', 'auto', 'bicicleta', 'otro']),
    patente: z.string().optional(),
    activo: z.boolean(),
});

type DriverFormValues = z.infer<typeof driverSchema>;

interface DriversDialogProps {
    driver?: DeliveryDriver | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DriversDialog({ driver, open, onOpenChange }: DriversDialogProps) {
    const { tenantId } = useTenant();
    const isEditing = !!driver;
    const [loading, setLoading] = useState(false);

    const form = useForm<DriverFormValues>({
        resolver: zodResolver(driverSchema) as Resolver<DriverFormValues>,
        defaultValues: {
            nombre: '',
            telefono: '',
            vehiculo: 'moto',
            patente: '',
            activo: true,
        },
    });

    useEffect(() => {
        if (driver && open) {
            form.reset({
                nombre: driver.nombre,
                telefono: driver.telefono,
                vehiculo: driver.vehiculo,
                patente: driver.patente || '',
                activo: driver.activo,
            });
        } else if (!isEditing && open) {
            form.reset({
                nombre: '',
                telefono: '',
                vehiculo: 'moto',
                patente: '',
                activo: true,
            });
        }
    }, [driver, form, open, isEditing]);

    const onSubmit = async (data: DriverFormValues) => {
        setLoading(true);
        try {
            const finalData = {
                ...data,
                updated_at: Timestamp.now(),
            };

            if (isEditing && driver) {
                const driverRef = doc(db, 'delivery_drivers', driver.id);
                // @ts-ignore
                await updateDoc(driverRef, finalData);
            } else {
                await addDoc(collection(db, 'delivery_drivers'), {
                    ...finalData,
                    tenantId: tenantId,
                    created_at: Timestamp.now(),
                });
            }
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving driver:', error);
            alert('Error al guardar el repartidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {isEditing ? 'Editar Repartidor' : 'Nuevo Repartidor'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-muted-foreground font-bold uppercase text-[10px]">Nombre Completo</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                {...form.register('nombre')}
                                className="pl-9"
                                placeholder="Ej: Juan Perez"
                            />
                        </div>
                        {form.formState.errors.nombre &&
                            <p className="text-red-500 text-xs">{form.formState.errors.nombre.message}</p>
                        }
                    </div>

                    <div className="space-y-2">
                        <Label className="text-muted-foreground font-bold uppercase text-[10px]">Teléfono (WhatsApp)</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                {...form.register('telefono')}
                                className="pl-9"
                                placeholder="Ej: 54911..."
                                type="tel"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Importante para enviar órdenes por WhatsApp.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground font-bold uppercase text-[10px]">Vehículo</Label>
                            <Select
                                value={form.watch('vehiculo')}
                                onValueChange={(val) => form.setValue('vehiculo', val as any)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="moto">Moto</SelectItem>
                                    <SelectItem value="auto">Auto</SelectItem>
                                    <SelectItem value="bicicleta">Bicicleta</SelectItem>
                                    <SelectItem value="otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground font-bold uppercase text-[10px]">Patente (Opcional)</Label>
                            <Input
                                {...form.register('patente')}
                                placeholder="Ej: ABC 123"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border mt-4">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={form.watch('activo')}
                                onCheckedChange={(val) => form.setValue('activo', val)}
                            />
                            <Label className="text-xs text-muted-foreground font-bold uppercase">Activo / Disponible</Label>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="default" disabled={loading} className="font-bold">
                            {loading ? 'Guardando...' : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Guardar Repartidor
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
