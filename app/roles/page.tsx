'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Role, Permission } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Shield, Plus, Trash2, Edit } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ALL_PERMISSIONS: { category: string; permissions: { id: Permission; label: string }[] }[] = [
    {
        category: 'Ventas',
        permissions: [
            { id: 'ventas.crear', label: 'Crear ventas' },
            { id: 'ventas.ver', label: 'Ver ventas' },
            { id: 'ventas.anular', label: 'Anular ventas' }
        ]
    },
    {
        category: 'Productos',
        permissions: [
            { id: 'productos.crear', label: 'Crear productos' },
            { id: 'productos.editar', label: 'Editar productos' },
            { id: 'productos.eliminar', label: 'Eliminar productos' },
            { id: 'productos.ver', label: 'Ver productos' }
        ]
    },
    {
        category: 'Clientes',
        permissions: [
            { id: 'clientes.crear', label: 'Crear clientes' },
            { id: 'clientes.editar', label: 'Editar clientes' },
            { id: 'clientes.ver', label: 'Ver clientes' }
        ]
    },
    {
        category: 'Proveedores',
        permissions: [
            { id: 'proveedores.crear', label: 'Crear proveedores' },
            { id: 'proveedores.editar', label: 'Editar proveedores' },
            { id: 'proveedores.ver', label: 'Ver proveedores' }
        ]
    },
    {
        category: 'Compras',
        permissions: [
            { id: 'compras.crear', label: 'Crear compras' },
            { id: 'compras.ver', label: 'Ver compras' }
        ]
    },
    {
        category: 'Reportes',
        permissions: [
            { id: 'reportes.ver', label: 'Ver reportes' },
            { id: 'reportes.exportar', label: 'Exportar reportes' }
        ]
    },
    {
        category: 'Caja',
        permissions: [
            { id: 'caja.abrir', label: 'Abrir caja' },
            { id: 'caja.cerrar', label: 'Cerrar caja' }
        ]
    },
    {
        category: 'Configuración',
        permissions: [
            { id: 'configuracion.ver', label: 'Ver configuración' },
            { id: 'configuracion.editar', label: 'Editar configuración' }
        ]
    },
    {
        category: 'Usuarios',
        permissions: [
            { id: 'usuarios.crear', label: 'Crear usuarios' },
            { id: 'usuarios.editar', label: 'Editar usuarios' }
        ]
    }
];

export default function RolesPage() {
    const { tenantId } = useTenant();
    const { user } = useAuth();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        permisos: [] as Permission[]
    });

    useEffect(() => {
        const loadRoles = async () => {
            if (!tenantId) return;

            const q = query(
                collection(db, 'roles'),
                where('tenantId', '==', tenantId)
            );
            const snapshot = await getDocs(q);
            const rolesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Role[];

            setRoles(rolesData);
            setLoading(false);
        };

        loadRoles();
    }, [tenantId]);

    const handleTogglePermission = (permission: Permission) => {
        if (formData.permisos.includes(permission)) {
            setFormData({
                ...formData,
                permisos: formData.permisos.filter(p => p !== permission)
            });
        } else {
            setFormData({
                ...formData,
                permisos: [...formData.permisos, permission]
            });
        }
    };

    const handleSave = async () => {
        if (!tenantId || !formData.nombre) {
            toast.error('El nombre del rol es obligatorio');
            return;
        }

        try {
            if (editingRole) {
                // Update
                await updateDoc(doc(db, 'roles', editingRole.id), {
                    nombre: formData.nombre,
                    descripcion: formData.descripcion,
                    permisos: formData.permisos,
                    updated_at: Timestamp.now()
                });
                toast.success('Rol actualizado');
                setRoles(roles.map(r => r.id === editingRole.id
                    ? { ...r, nombre: formData.nombre, descripcion: formData.descripcion, permisos: formData.permisos }
                    : r
                ));
            } else {
                // Create
                const newRole: Omit<Role, 'id'> = {
                    tenantId,
                    nombre: formData.nombre,
                    descripcion: formData.descripcion,
                    permisos: formData.permisos,
                    es_sistema: false,
                    created_at: Timestamp.now(),
                    updated_at: Timestamp.now()
                };

                const docRef = await addDoc(collection(db, 'roles'), newRole);
                toast.success('Rol creado');
                setRoles([...roles, { id: docRef.id, ...newRole }]);
            }

            // Reset form
            setFormData({ nombre: '', descripcion: '', permisos: [] });
            setEditingRole(null);
            setIsCreating(false);
        } catch (error) {
            console.error('Error saving role:', error);
            toast.error('Error al guardar el rol');
        }
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setFormData({
            nombre: role.nombre,
            descripcion: role.descripcion || '',
            permisos: role.permisos
        });
        setIsCreating(true);
    };

    const handleDelete = async (roleId: string) => {
        if (!window.confirm('¿Eliminar este rol? Los usuarios asignados perderán sus permisos.')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'roles', roleId));
            setRoles(roles.filter(r => r.id !== roleId));
            toast.success('Rol eliminado');
        } catch (error) {
            console.error('Error deleting role:', error);
            toast.error('Error al eliminar el rol');
        }
    };

    if (user?.rol !== 'admin' && user?.rol !== 'superadmin') {
        return (
            <div className="p-8 text-center">
                <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground italic">No tienes permisos para gestionar roles</p>
            </div>
        );
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando roles...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                        <Shield className="w-8 h-8" />
                        Gestión de Roles
                    </h1>
                    <p className="text-muted-foreground">Administra los permisos granulares por rol</p>
                </div>
                {!isCreating && (
                    <Button
                        onClick={() => setIsCreating(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Rol
                    </Button>
                )}
            </div>

            {isCreating && (
                <Card className="bg-card border-primary/30 shadow-2xl shadow-primary/5">
                    <CardHeader>
                        <CardTitle className="text-primary text-2xl font-black">
                            {editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Nombre del Rol *</Label>
                                <Input
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej: Supervisor"
                                    className="mt-2 bg-muted border-border"
                                />
                            </div>
                            <div>
                                <Label>Descripción</Label>
                                <Input
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    placeholder="Breve descripción del rol"
                                    className="mt-2 bg-muted border-border"
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                Permisos del Sistema
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ALL_PERMISSIONS.map((group) => (
                                    <Card key={group.category} className="bg-muted/30 border-border hover:border-primary/20 transition-all">
                                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/50">
                                            <CardTitle className="text-xs font-black uppercase text-primary/70">{group.category}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {group.permissions.map((perm) => (
                                                <div key={perm.id} className="flex items-center justify-between">
                                                    <Label htmlFor={perm.id} className="text-xs cursor-pointer">
                                                        {perm.label}
                                                    </Label>
                                                    <Switch
                                                        id={perm.id}
                                                        checked={formData.permisos.includes(perm.id)}
                                                        onCheckedChange={() => handleTogglePermission(perm.id)}
                                                    />
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsCreating(false);
                                    setEditingRole(null);
                                    setFormData({ nombre: '', descripcion: '', permisos: [] });
                                }}
                                className="border-border"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-md shadow-primary/20"
                            >
                                {editingRole ? 'Actualizar' : 'Crear'} Rol
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Roles List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map((role) => (
                    <Card key={role.id} className="bg-card border-border hover:shadow-lg transition-all shadow-md">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-foreground font-bold">
                                        {role.nombre}
                                        {role.es_sistema && (
                                            <Badge variant="outline" className="text-[8px] border-primary/20 text-primary bg-primary/5">
                                                SISTEMA
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    {role.descripcion && (
                                        <CardDescription className="mt-1">{role.descripcion}</CardDescription>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold mb-2">
                                    Permisos ({role.permisos.length})
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {role.permisos.slice(0, 6).map((perm) => (
                                        <Badge key={perm} variant="secondary" className="text-[9px]">
                                            {perm}
                                        </Badge>
                                    ))}
                                    {role.permisos.length > 6 && (
                                        <Badge variant="outline" className="text-[9px] border-muted-foreground/30 text-muted-foreground">
                                            +{role.permisos.length - 6}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {!role.es_sistema && (
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(role)}
                                        className="flex-1 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    >
                                        <Edit className="w-3 h-3 mr-1" />
                                        Editar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(role.id)}
                                        className="flex-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Eliminar
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}

                {roles.length === 0 && !isCreating && (
                    <Card className="col-span-full border-dashed border-2 border-border">
                        <CardContent className="py-20 text-center">
                            <Shield className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">No hay roles personalizados</h3>
                            <p className="text-muted-foreground mb-6">Crea roles con permisos específicos para tu equipo</p>
                            <Button
                                onClick={() => setIsCreating(true)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg shadow-primary/20"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Crear Primer Rol
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
