'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/types';
import { useMemo } from 'react';

// Predefined permission sets for legacy roles
const ADMIN_PERMISSIONS: Permission[] = [
    'ventas.crear', 'ventas.ver', 'ventas.anular',
    'productos.crear', 'productos.editar', 'productos.eliminar', 'productos.ver',
    'clientes.crear', 'clientes.editar', 'clientes.ver',
    'proveedores.crear', 'proveedores.editar', 'proveedores.ver',
    'compras.crear', 'compras.ver',
    'reportes.ver', 'reportes.exportar',
    'caja.abrir', 'caja.cerrar',
    'configuracion.ver', 'configuracion.editar',
    'usuarios.crear', 'usuarios.editar',
    'recetas.configurar'
];

const CASHIER_PERMISSIONS: Permission[] = [
    'ventas.crear', 'ventas.ver',
    'productos.ver',
    'clientes.ver',
    'caja.abrir', 'caja.cerrar'
];

export function usePermissions() {
    const { user } = useAuth();

    const permissions = useMemo(() => {
        if (!user) return [];

        // SuperAdmin has all permissions
        if (user.rol === 'superadmin') return ADMIN_PERMISSIONS;

        // Legacy roles
        if (user.rol === 'admin') return ADMIN_PERMISSIONS;
        if (user.rol === 'cajero') return CASHIER_PERMISSIONS;

        // Custom role (future implementation with role_id lookup)
        // For now, return empty array
        return [];
    }, [user]);

    const hasPermission = (permission: Permission): boolean => {
        return permissions.includes(permission);
    };

    const hasAnyPermission = (perms: Permission[]): boolean => {
        return perms.some(p => permissions.includes(p));
    };

    const hasAllPermissions = (perms: Permission[]): boolean => {
        return perms.every(p => permissions.includes(p));
    };

    return {
        permissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions
    };
}
