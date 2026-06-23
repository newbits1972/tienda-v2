'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Store, Plus, MapPin, Phone, Star, Edit2, Trash2, X } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { Branch } from '@/lib/types';
import { useTenant } from '@/hooks/useTenant';
import { useBranch } from '@/contexts/BranchContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function SucursalesPage() {
    const { tenantId } = useTenant();
    const { setActiveBranchId, activeBranchId } = useBranch();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [form, setForm] = useState({
        nombre: '',
        direccion: '',
        telefono: '',
        es_casa_central: false,
    });

    useEffect(() => {
        if (!tenantId) return;
        const q = query(collection(db, 'branches'), where('tenantId', '==', tenantId));
        const unsubscribe = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id }) as Branch);
            setBranches(data.sort((a, b) => Number(b.es_casa_central) - Number(a.es_casa_central)));
        });
        return () => unsubscribe();
    }, [tenantId]);

    const handleSave = async () => {
        if (!form.nombre.trim() || !tenantId) return;

        try {
            if (editingBranch) {
                await updateDoc(doc(db, 'branches', editingBranch.id), {
                    nombre: form.nombre,
                    direccion: form.direccion,
                    telefono: form.telefono,
                    es_casa_central: form.es_casa_central,
                    updated_at: Timestamp.now(),
                });
                toast.success('Sucursal actualizada');
            } else {
                // Crear casa central automáticamente si es la primera
                const esPrimera = branches.length === 0;
                await addDoc(collection(db, 'branches'), {
                    tenantId,
                    nombre: form.nombre,
                    direccion: form.direccion,
                    telefono: form.telefono,
                    es_casa_central: form.es_casa_central || esPrimera,
                    activa: true,
                    created_at: Timestamp.now(),
                    updated_at: Timestamp.now(),
                });
                toast.success('Sucursal creada');
            }
            setIsDialogOpen(false);
            setEditingBranch(null);
            setForm({ nombre: '', direccion: '', telefono: '', es_casa_central: false });
        } catch (e: any) {
            toast.error('Error: ' + e.message);
        }
    };

    const handleEdit = (b: Branch) => {
        setEditingBranch(b);
        setForm({
            nombre: b.nombre,
            direccion: b.direccion || '',
            telefono: b.telefono || '',
            es_casa_central: b.es_casa_central,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (b: Branch) => {
        if (b.es_casa_central) {
            toast.error('No se puede eliminar la casa central');
            return;
        }
        if (!confirm(`¿Eliminar la sucursal "${b.nombre}"?`)) return;
        await deleteDoc(doc(db, 'branches', b.id));
        toast.success('Sucursal eliminada');
    };

    const handleSetActive = (b: Branch) => {
        setActiveBranchId(b.id);
        toast.success(`Sucursal activa: ${b.nombre}`);
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Store className="w-6 h-6 text-primary" />
                            Sucursales
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Gestiona tus locales físicos y sus stocks independientes
                        </p>
                    </div>
                    <Button onClick={() => { setEditingBranch(null); setForm({ nombre: '', direccion: '', telefono: '', es_casa_central: false }); setIsDialogOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" /> Nueva Sucursal
                    </Button>
                </div>

                {branches.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="py-12 text-center">
                            <Store className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-muted-foreground mb-4">Todavía no tienes sucursales.</p>
                            <p className="text-xs text-muted-foreground mb-4">
                                La primera sucursal se creará como Casa Central automáticamente.
                            </p>
                            <Button onClick={() => setIsDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" /> Crear primera sucursal
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {branches.map(b => (
                            <Card key={b.id} className={activeBranchId === b.id ? 'border-primary ring-2 ring-primary/20' : ''}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <Store className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">{b.nombre}</CardTitle>
                        </div>
                        {b.es_casa_central && (
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                                <Star className="w-3 h-3 mr-1" /> Casa Central
                            </Badge>
                        )}
                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {b.direccion && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <MapPin className="w-3 h-3" /> {b.direccion}
                                        </div>
                                    )}
                                    {b.telefono && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone className="w-3 h-3" /> {b.telefono}
                                        </div>
                                    )}
                                    <div className="flex gap-2 pt-3">
                                        {activeBranchId === b.id ? (
                                            <Badge variant="outline" className="border-primary text-primary">Activa</Badge>
                                        ) : (
                                            <Button size="sm" variant="outline" onClick={() => handleSetActive(b)} className="flex-1">
                                                Seleccionar
                                            </Button>
                                        )}
                                        <Button size="icon" variant="ghost" onClick={() => handleEdit(b)}>
                                            <Edit2 className="w-3 h-3" />
                                        </Button>
                                        {!b.es_casa_central && (
                                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(b)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Nombre *</Label>
                            <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Local Centro" />
                        </div>
                        <div>
                            <Label>Dirección</Label>
                            <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Ej: Av. Santa Fe 1234" />
                        </div>
                        <div>
                            <Label>Teléfono</Label>
                            <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="Ej: 011 1234-5678" />
                        </div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.es_casa_central}
                                onChange={e => setForm({ ...form, es_casa_central: e.target.checked })}
                                className="w-4 h-4"
                            />
                            Marcar como Casa Central (destino default de compras)
                        </label>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={!form.nombre.trim()}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
