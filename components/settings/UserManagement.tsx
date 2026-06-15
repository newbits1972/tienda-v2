'use client';

import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Shield, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
    collection,
    query,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
    Timestamp
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '@/lib/firebase/config';
import { User } from '@/lib/types';
import { useTenant } from '@/hooks/useTenant';
import { where } from 'firebase/firestore';

// We need a secondary app to create users without logging out the current admin
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export function UserManagement() {
    const { tenantId } = useTenant();
    const [users, setUsers] = useState<User[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // New User Form State
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        nombre: '',
        rol: 'cajero' as 'admin' | 'cajero'
    });

    // Load users
    useEffect(() => {
        if (!tenantId) return;
        const q = query(collection(db, 'users'), where('tenantId', '==', tenantId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
            setUsers(usersData);
        });
        return () => unsubscribe();
    }, []);

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.password || !newUser.nombre) {
            toast.error('Por favor complete todos los campos');
            return;
        }

        setIsLoading(true);
        let secondaryApp;

        try {
            // 1. Initialize secondary app to create user
            const appName = 'secondaryApp';
            if (!getApps().some(app => app.name === appName)) {
                secondaryApp = initializeApp(firebaseConfig, appName);
            } else {
                secondaryApp = getApp(appName);
            }

            const secondaryAuth = getAuth(secondaryApp);

            // 2. Create user in Auth
            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth,
                newUser.email,
                newUser.password
            );

            // 3. Create user doc in Firestore (using main db instance)
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                email: newUser.email,
                nombre: newUser.nombre,
                rol: newUser.rol,
                tenantId,
                activo: true,
                created_at: Timestamp.now()
            });

            // 4. Cleanup secondary auth session
            await signOut(secondaryAuth);

            toast.success('Usuario creado exitosamente');
            setIsDialogOpen(false);
            setNewUser({ email: '', password: '', nombre: '', rol: 'cajero' });

        } catch (error: any) {
            console.error('Error creating user:', error);
            let msg = 'Error al crear usuario';
            if (error.code === 'auth/email-already-in-use') msg = 'El email ya está registrado';
            if (error.code === 'auth/weak-password') msg = 'La contraseña es muy débil (min 6 caracteres)';
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg border border-border">
                <div>
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <UserCircle className="w-6 h-6 text-primary" />
                        Gestión de Personal
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Administra quienes tienen acceso al sistema y sus permisos.
                    </p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} variant="primary" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Nuevo Usuario
                </Button>
            </div>

            <div className="rounded-md border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow className="border-border hover:bg-muted">
                            <TableHead className="text-muted-foreground">Nombre</TableHead>
                            <TableHead className="text-muted-foreground">Email</TableHead>
                            <TableHead className="text-muted-foreground">Rol</TableHead>
                            <TableHead className="text-muted-foreground">Estado</TableHead>
                            {/* <TableHead className="text-muted-foreground text-right">Acciones</TableHead> */}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} className="border-border hover:bg-muted/50">
                                <TableCell className="font-medium text-foreground">{user.nombre}</TableCell>
                                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.rol === 'admin' ? 'default' : 'secondary'}
                                        className={user.rol === 'admin' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground'}>
                                        {user.rol === 'admin' ? 'Administrador' : 'Cajero'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="border-green-500/20 text-green-500 bg-green-500/10">
                                        Activo
                                    </Badge>
                                </TableCell>
                                {/* Future: Delete/Edit actions */}
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                                    No hay usuarios registrados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Crear Nuevo Usuario</DialogTitle>
                        <DialogDescription>
                            El usuario podrá iniciar sesión con estas credenciales.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre Completo</Label>
                            <Input
                                id="name"
                                value={newUser.nombre}
                                onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                                className=""
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                className=""
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                className=""
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">Rol</Label>
                            <Select
                                value={newUser.rol}
                                onValueChange={(value: 'admin' | 'cajero') => setNewUser({ ...newUser, rol: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cajero">Cajero</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleCreateUser} disabled={isLoading} className="shadow-md shadow-primary/20">
                            {isLoading ? 'Creando...' : 'Crear Usuario'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
