'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';

export default function CleanupTablesPage() {
    const { user, loading: authLoading } = useAuth();
    const { tenantId } = useTenant();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [stats, setStats] = useState({ tables: 0, orders: 0 });

    useEffect(() => {
        if (!authLoading && (!user || user.rol !== 'superadmin')) {
            redirect('/dashboard');
        }
    }, [user, authLoading]);

    useEffect(() => {
        if (tenantId && user?.rol === 'superadmin') {
            loadStats();
        }
    }, [tenantId, user]);

    const loadStats = async () => {
        try {
            const tablesQ = query(collection(db, 'tables'), where('tenantId', '==', tenantId));
            const ordersQ = query(collection(db, 'orders'), where('tenantId', '==', tenantId), where('type', '==', 'salon'));

            const [tablesSnap, ordersSnap] = await Promise.all([
                getDocs(tablesQ),
                getDocs(ordersQ)
            ]);

            setStats({
                tables: tablesSnap.size,
                orders: ordersSnap.size
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const handleCleanup = async () => {
        if (!window.confirm('¿ESTÁS SEGURO? Se borrarán permanentemente todas las mesas y pedidos de salón de esta tienda.')) {
            return;
        }

        setLoading(true);
        setStatus('Iniciando limpieza...');
        try {
            // 1. Delete Tables
            const tablesQ = query(collection(db, 'tables'), where('tenantId', '==', tenantId));
            const tablesSnap = await getDocs(tablesQ);
            const tableDeletes = tablesSnap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(tableDeletes);
            setStatus(`✅ ${tablesSnap.size} mesas eliminadas.`);

            // 2. Delete Salon Orders
            const ordersQ = query(collection(db, 'orders'), where('tenantId', '==', tenantId), where('type', '==', 'salon'));
            const ordersSnap = await getDocs(ordersQ);
            const orderDeletes = ordersSnap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(orderDeletes);
            setStatus(prev => prev + `\n✅ ${ordersSnap.size} pedidos de salón eliminados.`);

            toast.success('Limpieza completada con éxito');
            loadStats();
        } catch (error: any) {
            console.error(error);
            setStatus('❌ Error: ' + error.message);
            toast.error('Error durante la limpieza');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return <div className="p-8 text-center text-zinc-500">Verificando permisos...</div>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 font-sans">
            <div className="max-w-md w-full">
                <Card className="bg-zinc-900 border-zinc-800 shadow-2xl overflow-hidden">
                    <div className="h-2 bg-gold" />
                    <CardHeader className="text-center pt-8">
                        <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-gold/20">
                            <Trash2 className="w-8 h-8 text-gold" />
                        </div>
                        <CardTitle className="text-2xl font-black text-white uppercase tracking-tight">Limpiar Mesas</CardTitle>
                        <CardDescription className="text-zinc-500">
                            Herramienta para borrar registros de mesas y pedidos activos para el tenant actual.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-400 text-sm">Tenant ID:</span>
                                <span className="text-white font-mono text-xs bg-zinc-900 px-2 py-1 rounded">{tenantId}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-zinc-900 rounded-xl text-center border border-zinc-800">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Mesas</p>
                                    <p className="text-2xl font-black text-white">{stats.tables}</p>
                                </div>
                                <div className="p-3 bg-zinc-900 rounded-xl text-center border border-zinc-800">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Pedidos Salón</p>
                                    <p className="text-2xl font-black text-white">{stats.orders}</p>
                                </div>
                            </div>
                        </div>

                        {status && (
                            <div className="bg-gold/5 border border-gold/10 rounded-xl p-4 text-xs font-mono text-gold whitespace-pre-line">
                                {status}
                            </div>
                        )}

                        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex gap-3 items-start">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                            <p className="text-[10px] text-red-400 font-medium leading-relaxed">
                                <span className="font-bold uppercase block mb-1">Advertencia de Limpieza Permanent</span>
                                Esta acción eliminará todas las mesas configuradas y pedidos pendientes de cobro para tu tienda. No se puede deshacer.
                            </p>
                        </div>

                        <Button
                            onClick={handleCleanup}
                            disabled={loading}
                            className="w-full h-14 bg-gold hover:bg-yellow-500 text-black font-black rounded-xl text-lg uppercase tracking-widest shadow-lg shadow-gold/10 transition-all active:scale-95"
                        >
                            {loading ? 'Borrando...' : 'Ejecutar Limpieza'}
                        </Button>

                        <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                            Sólo disponible para Super-Administradores
                        </p>
                    </CardContent>
                </Card>

                <Button
                    variant="link"
                    onClick={() => redirect('/dashboard')}
                    className="w-full mt-6 text-zinc-500 hover:text-white"
                >
                    Volver al Dashboard
                </Button>
            </div>
        </div>
    );
}
