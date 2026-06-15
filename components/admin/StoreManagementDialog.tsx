'use client';

import React, { useState, useEffect } from 'react';
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
import { provisionAdmin, deleteTenant, updateTenantStatus } from '@/lib/admin/adminService';
import { toast } from 'sonner';
import { Store, UserPlus, ExternalLink, Users, Copy, ShieldAlert, Power, Trash2, Settings, Puzzle } from 'lucide-react';
import { StoreConfig, User } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StoreManagementDialogProps {
    isOpen: boolean;
    onClose: () => void;
    store: StoreConfig | null;
}

export function StoreManagementDialog({ isOpen, onClose, store }: StoreManagementDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        nombre: '',
        password: ''
    });
    const [admins, setAdmins] = useState<User[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);
    const [savingModules, setSavingModules] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [localModules, setLocalModules] = useState(store?.modules || {
        afip_fiscal: false,
        delivery: false,
        waiter: false,
        integrated_pos: false
    });

    useEffect(() => {
        if (store?.modules) {
            setLocalModules(store.modules);
        } else {
            setLocalModules({
                afip_fiscal: false,
                waiter: false,
                delivery: false,
                integrated_pos: false
            });
        }
    }, [store]);

    useEffect(() => {
        if (store && isOpen) {
            fetchStoreAdmins();
        }
    }, [store, isOpen]);

    const fetchStoreAdmins = async () => {
        if (!store?.id) return;
        setLoadingAdmins(true);
        try {
            const q = query(collection(db, 'users'), where('tenantId', '==', store.id));
            const snap = await getDocs(q);
            const adminList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAdmins(adminList);
        } catch (error) {
            console.error("Error fetching admins:", error);
        } finally {
            setLoadingAdmins(false);
        }
    };

    const handleProvisionAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!store || !formData.email || !formData.nombre) return;

        setLoading(true);
        try {
            await provisionAdmin(formData.email, formData.nombre, store.id, formData.password);
            toast.success('Administrador provisionado correctamente');
            setFormData({ email: '', nombre: '', password: '' });
            fetchStoreAdmins();
        } catch (error: any) {
            toast.error(error.message || 'Error al provisionar administrador');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleModule = async (moduleKey: keyof typeof localModules) => {
        if (!store) return;
        const newValue = !localModules[moduleKey];
        const updatedModules = { ...localModules, [moduleKey]: newValue };
        setLocalModules(updatedModules);

        setSavingModules(true);
        try {
            const storeRef = doc(db, 'store_configs', store.id);
            await updateDoc(storeRef, {
                modules: updatedModules,
                updated_at: new Date()
            });
            toast.success(`Módulo ${moduleKey} actualizado`);
        } catch (error) {
            console.error("Error updating modules:", error);
            toast.error("Error al actualizar módulos");
            setLocalModules(localModules);
        } finally {
            setSavingModules(false);
        }
    };

    const handleToggleStoreStatus = async () => {
        if (!store) return;
        const newStatus = !store.active;
        setLoading(true);
        try {
            await updateTenantStatus(store.id, newStatus);
            toast.success(newStatus ? 'Tienda reactivada' : 'Tienda pausada correctamente');
            onClose(); // Close to refresh data in parent
        } catch (error) {
            toast.error('Error al cambiar estado de la tienda');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStore = async () => {
        if (!store) return;
        const confirmName = prompt(`Para eliminar permanentemente "${store.nombre}", escribe el nombre de la tienda:`);
        if (confirmName !== store.nombre) {
            if (confirmName !== null) toast.error('El nombre no coincide. Operación cancelada.');
            return;
        }

        setIsDeleting(true);
        try {
            await deleteTenant(store.id);
            toast.success('Tienda eliminada permanentemente');
            onClose();
        } catch (error) {
            toast.error('Error al eliminar la tienda');
        } finally {
            setIsDeleting(false);
        }
    };

    const copyCatalogLink = () => {
        if (!store) return;
        const url = `${window.location.origin}/catalogo/${store.id}`;
        navigator.clipboard.writeText(url);
        toast.success('Link del catálogo copiado');
    };

    if (!store) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground p-0 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-border bg-muted/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-primary text-2xl font-black">
                            <Store className="w-6 h-6" />
                            {store.nombre}
                            {!store.active && <Badge variant="destructive" className="ml-2">PAUSADA</Badge>}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground mt-1">
                            ID: <span className="font-mono text-xs">{store.id}</span> • Gestión global del inquilino
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-12 px-6 gap-6">
                        <TabsTrigger value="general" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                            General
                        </TabsTrigger>
                        <TabsTrigger value="modules" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                            Módulos
                        </TabsTrigger>
                        <TabsTrigger value="access" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                            Accesos
                        </TabsTrigger>
                        <TabsTrigger value="danger" className="data-[state=active]:bg-transparent data-[state=active]:text-red-500 data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-full px-0">
                            Avanzado
                        </TabsTrigger>
                    </TabsList>

                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        <TabsContent value="general" className="mt-0 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-bold text-foreground mb-3">Catálogo Público</h4>
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
                                        <code className="text-xs text-muted-foreground truncate flex-1 font-mono">
                                            {window.location.origin}/catalogo/{store.id}
                                        </code>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" onClick={copyCatalogLink} className="h-8 w-8 text-muted-foreground hover:text-primary">
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" asChild className="h-8 w-8 text-muted-foreground hover:text-primary">
                                                <a href={`/catalogo/${store.id}`} target="_blank" rel="noreferrer">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Rubro</Label>
                                        <p className="text-sm text-foreground bg-muted p-2 rounded border border-border">{store.rubro || 'No definido'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">CUIT</Label>
                                        <p className="text-sm text-foreground bg-muted p-2 rounded border border-border">{store.cuit || 'No definido'}</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="modules" className="mt-0 space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { key: 'afip_fiscal', label: 'Facturación AFIP', desc: 'Tickets fiscales y conexión con AFIP' },
                                    { key: 'waiter', label: 'Módulo de Mozo', desc: 'Gestión de mesas y comandas' },
                                    { key: 'delivery', label: 'Delivery y Logística', desc: 'Repartos y estados de envío' }
                                ].map((mod) => (
                                    <div key={mod.key} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 rounded-lg bg-background">
                                                <Puzzle className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-bold text-foreground">{mod.label}</Label>
                                                <p className="text-xs text-muted-foreground">{mod.desc}</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={(localModules as any)[mod.key]}
                                            onCheckedChange={() => handleToggleModule(mod.key as any)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="access" className="mt-0 space-y-8">
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-emerald-500 mb-2">
                                    <UserPlus className="w-4 h-4" />
                                    Alta de Administrador
                                </div>
                                <form onSubmit={handleProvisionAdmin} className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Email</Label>
                                        <Input
                                            type="email"
                                            placeholder="email@ejemplo.com"
                                            className="h-10 bg-background border-border focus:border-emerald-500/50 transition-all"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Nombre</Label>
                                        <Input
                                            placeholder="Nombre Completo"
                                            className="h-10 bg-background border-border focus:border-emerald-500/50 transition-all"
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                                        >
                                            {loading ? 'Procesando...' : 'Habilitar Acceso e Invitar'}
                                        </Button>
                                    </div>
                                </form>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Users className="w-3 h-3" />
                                    Usuarios de la Tienda
                                </h4>
                                <div className="space-y-2">
                                    {loadingAdmins ? (
                                        <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
                                    ) : admins.map(admin => (
                                        <div key={admin.id} className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                    {admin.nombre.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{admin.nombre}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono">{admin.email}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                                                {admin.rol}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="danger" className="mt-0 space-y-6">
                            <div className="p-5 border border-red-900/30 bg-red-950/10 rounded-xl space-y-6">
                                <div className="flex items-center gap-2 text-red-500 font-bold">
                                    <ShieldAlert className="w-5 h-5" />
                                    Acciones de Control SaaS
                                </div>

                                <div className="flex items-center justify-between gap-6 p-4 rounded-lg bg-red-950/20 border border-red-900/20">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-foreground">Suspender Tienda</p>
                                        <p className="text-xs text-muted-foreground">Desactiva el acceso de todos los usuarios. Útil si hay falta de pago.</p>
                                    </div>
                                    <Button
                                        onClick={handleToggleStoreStatus}
                                        variant={store.active ? "destructive" : "outline"}
                                        disabled={loading}
                                        className="gap-2 min-w-[140px]"
                                    >
                                        <Power className="w-4 h-4" />
                                        {store.active ? 'Pausar Tienda' : 'Reactivar'}
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between gap-6 p-4 rounded-lg bg-red-950/20 border border-red-900/20">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-foreground uppercase tracking-tighter">Eliminar Permanentemente</p>
                                        <p className="text-xs text-muted-foreground">Borra la configuración y accesos. Esta acción es IRREVERSIBLE.</p>
                                    </div>
                                    <Button
                                        onClick={handleDeleteStore}
                                        variant="destructive"
                                        disabled={isDeleting}
                                        className="bg-red-900 hover:bg-red-800 gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter className="p-6 bg-card border-t border-border">
                    <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        Cerrar Panel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

