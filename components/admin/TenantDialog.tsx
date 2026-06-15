'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTenant, provisionAdmin } from '@/lib/admin/adminService';
import { toast } from 'sonner';
import { Store } from 'lucide-react';

interface TenantDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function TenantDialog({ isOpen, onClose, onSuccess }: TenantDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        nombre: '',
        adminEmail: '',
        adminNombre: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.id || !formData.nombre) {
            toast.error('Por favor completa todos los campos.');
            return;
        }

        // Validate ID format (slug)
        const idRegex = /^[a-z0-9-]+$/;
        if (!idRegex.test(formData.id)) {
            toast.error('El ID solo puede contener letras minúsculas, números y guiones.');
            return;
        }

        setLoading(true);
        try {
            await createTenant(formData.id, formData.nombre);

            // Generate initial admin
            if (formData.adminEmail) {
                await provisionAdmin(
                    formData.adminEmail,
                    formData.adminNombre || formData.nombre,
                    formData.id
                );
            }

            toast.success('Tienda y administrador creados exitosamente');
            setFormData({ id: '', nombre: '', adminEmail: '', adminNombre: '' });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error creating tenant:', error);
            toast.error(error.message || 'Error al crear la tienda');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-gold">
                        <Store className="w-5 h-5" />
                        Nueva Tienda
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Configura un nuevo inquilino en la plataforma.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="nombre" className="text-muted-foreground">Nombre del Negocio</Label>
                        <Input
                            id="nombre"
                            placeholder="Ej: Fiambrería Los Pinos"
                            className="bg-background border-border text-foreground"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="id" className="text-muted-foreground">ID Único (Tenant ID)</Label>
                        <Input
                            id="id"
                            placeholder="ej: fiambreria-los-pinos"
                            className="bg-background border-border text-foreground font-mono"
                            value={formData.id}
                            onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().trim() })}
                            required
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Este ID se usará en la URL y para aislar los datos. No se puede cambiar después.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-border space-y-4">
                        <Label className="text-xs font-bold text-gold uppercase tracking-wider">Administrador Inicial</Label>
                        <div className="space-y-2">
                            <Label htmlFor="adminEmail" className="text-muted-foreground">Email de Invitación</Label>
                            <Input
                                id="adminEmail"
                                type="email"
                                placeholder="admin@tienda.com"
                                className="bg-background border-border text-foreground"
                                value={formData.adminEmail}
                                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="adminNombre" className="text-muted-foreground">Nombre del Administrador</Label>
                            <Input
                                id="adminNombre"
                                placeholder="Ej: Juan Pérez"
                                className="bg-background border-border text-foreground"
                                value={formData.adminNombre}
                                onChange={(e) => setFormData({ ...formData, adminNombre: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-gold text-black hover:bg-gold/90 font-bold"
                        >
                            {loading ? 'Creando...' : 'Crear Tienda'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
