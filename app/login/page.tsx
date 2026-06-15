'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { login, createInitialAdmin } from '@/lib/firebase/authActions';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, AlertCircle, User } from 'lucide-react';

function LoginForm() {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Handle invitation parameters
    useEffect(() => {
        const invMode = searchParams?.get('mode');
        const invEmail = searchParams?.get('email');
        const invNombre = searchParams?.get('nombre');

        if (invMode === 'register' || invMode === 'invite') {
            setMode('register');
        }
        if (invEmail) {
            setEmail(invEmail);
        }
        if (invNombre) {
            setNombre(invNombre);
        }
    }, [searchParams]);

    // Diagnóstico de configuración
    useEffect(() => {
        const config = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        };

        if (!config.apiKey || config.apiKey === 'your_api_key_here' || config.apiKey === 'YOUR_API_KEY') {
            console.error('⚠️ Firebase API Key no detectada o inválida en .env.local');
        } else {
            console.log('✅ Firebase Config cargada para el proyecto:', config.projectId);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                if (!nombre) throw new Error('El nombre es requerido para el registro.');
                await createInitialAdmin(email, password, nombre);
            }
            router.push('/dashboard');
        } catch (err: any) {
            console.error('Auth error:', err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Credenciales incorrectas. Por favor, intenta de nuevo.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Este email ya está en uso. Prueba iniciando sesión.');
            } else if (err.code === 'auth/weak-password') {
                setError('La contraseña es demasiado débil (mínimo 6 caracteres).');
            } else {
                setError(err.message || 'Ocurrió un error al intentar autenticar.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0d0d0d] relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[100px]" />

            <div className="z-10 w-full max-w-md px-4">
                <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <h1 className="text-4xl font-extrabold text-gold tracking-tight mb-2">DataSense</h1>
                    <p className="text-muted-foreground">Sistema Retail - Gestión Inteligente</p>
                </div>

                <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in duration-700">
                    <CardContent className="pt-8">
                        <div className="mb-6 text-center">
                            <h2 className="text-xl font-semibold text-white">
                                {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta Administrador'}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {mode === 'login'
                                    ? 'Ingresa tus credenciales para continuar'
                                    : 'Configura el primer acceso al sistema'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === 'register' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Label htmlFor="nombre" className="text-white/80">Nombre Completo</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="nombre"
                                            placeholder="Juan Pérez"
                                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-gold/50"
                                            value={nombre}
                                            onChange={(e) => setNombre(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white/80">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@datasense.com"
                                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-gold/50"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white/80">Contraseña</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-gold/50"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in shake pointer-events-none">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-gold hover:bg-gold/90 text-black font-bold h-11 mt-4 shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all active:scale-[0.98]"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        Procesando...
                                    </div>
                                ) : (
                                    mode === 'login' ? 'Acceder al Sistema' : 'Crear Administrador'
                                )}
                            </Button>

                            <div className="text-center mt-4">
                                <button
                                    type="button"
                                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                    className="text-xs text-gold hover:underline transition-all"
                                >
                                    {mode === 'login'
                                        ? '¿Es tu primera vez? Crea un administrador'
                                        : 'Ya tengo cuenta, iniciar sesión'}
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center mt-8 text-white/40 text-xs">
                    © 2026 DataSense. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-gold">Cargando...</div>}>
            <LoginForm />
        </Suspense>
    );
}
