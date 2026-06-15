'use client';

import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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
import { Truck } from 'lucide-react';

interface Provider {
    id: string;
    nombre: string;
    cuit?: string;
    telefono: string;
    email: string;
    direccion: string;
    saldo: number;
}

interface ProviderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    provider: Provider | null;
}

export function ProviderDialog({ isOpen, onClose, provider }: ProviderDialogProps) {
    const [formData, setFormData] = useState({
        nombre: '',
        cuit: '',
        telefono: '',
        email: '',
        direccion: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (provider) {
            setFormData({
                nombre: provider.nombre,
                cuit: provider.cuit || '',
                telefono: provider.telefono,
                email: provider.email,
                direccion: provider.direccion
            });
        } else {
            setFormData({
                nombre: '',
                cuit: '',
                telefono: '',
                email: '',
                direccion: ''
            });
        }
    }, [provider, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombre || !formData.telefono) {
            alert('El nombre y teléfono son obligatorios.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (provider) {
                // Update existing provider
                const providerRef = doc(db, 'providers', provider.id);
                await updateDoc(providerRef, {
                    ...formData,
                    updated_at: Timestamp.now()
                });
            } else {
                // Create new provider
                await addDoc(collection(db, 'providers'), {
                    ...formData,
                    saldo: 0,
                    updated_at: Timestamp.now()
                });
            }
            onClose();
        } catch (error) {
            console.error('Error saving provider:', error);
            alert('Error al guardar el proveedor.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gold flex items-center gap-2">
                        <Truck className="w-6 h-6" />
                        {provider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre *</Label>
                        <Input
                            id="nombre"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            placeholder="Distribuidora San Martín"
                            className="bg-background border-border"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cuit">CUIT</Label>
                        <Input
                            id="cuit"
                            value={formData.cuit}
                            onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                            placeholder="20-12345678-9"
                            className="bg-background border-border"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="telefono">Teléfono *</Label>
                            <Input
                                id="telefono"
                                value={formData.telefono}
                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                placeholder="011-4567-8900"
                                className="bg-background border-border"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="ventas@proveedor.com"
                                className="bg-background border-border"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input
                            id="direccion"
                            value={formData.direccion}
                            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                            placeholder="Av. Corrientes 1234, CABA"
                            className="bg-background border-border"
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground">
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="gold"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Guardando...' : (provider ? 'Actualizar' : 'Crear')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
