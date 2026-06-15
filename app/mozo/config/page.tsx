'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Table } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function MozoConfigPage() {
    const { tenantId } = useTenant();
    const router = useRouter();
    const [tables, setTables] = useState<Table[]>([]);
    const [numberOfTables, setNumberOfTables] = useState(10);
    const [defaultCapacity, setDefaultCapacity] = useState(4);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadTables = async () => {
            if (!tenantId) return;

            const q = query(
                collection(db, 'tables'),
                where('tenantId', '==', tenantId)
            );
            const snapshot = await getDocs(q);
            const tablesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Table[];

            tablesData.sort((a, b) => a.numero - b.numero);
            setTables(tablesData);
            setLoading(false);
        };

        loadTables();
    }, [tenantId]);

    const handleGenerate = async () => {
        if (!tenantId) return;

        if (tables.length > 0) {
            if (!window.confirm('¿Eliminar configuración actual y crear nuevas mesas?')) {
                return;
            }
        }

        setSaving(true);
        try {
            // Delete all existing tables using batch for atomicity
            if (tables.length > 0) {
                const { writeBatch } = await import('firebase/firestore');
                const batch = writeBatch(db);

                tables.forEach(table => {
                    batch.delete(doc(db, 'tables', table.id));
                });

                await batch.commit();
            }

            // Create new tables
            const newTables: Table[] = [];

            for (let i = 1; i <= numberOfTables; i++) {
                const tableData: Omit<Table, 'id'> = {
                    tenantId,
                    numero: i,
                    estado: 'libre',
                    capacidad: defaultCapacity,
                    created_at: Timestamp.now(),
                    updated_at: Timestamp.now()
                };

                const docRef = await addDoc(collection(db, 'tables'), tableData);
                newTables.push({ id: docRef.id, ...tableData });
            }

            // Update local state
            setTables(newTables);
            toast.success(`Se crearon ${numberOfTables} mesas correctamente`);
        } catch (error) {
            console.error('Error creating tables:', error);
            toast.error('Error al crear las mesas');

            // Reload tables in case of error to ensure consistency
            const q = query(
                collection(db, 'tables'),
                where('tenantId', '==', tenantId)
            );
            const snapshot = await getDocs(q);
            const tablesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Table[];
            tablesData.sort((a, b) => a.numero - b.numero);
            setTables(tablesData);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateCapacity = async (tableId: string, newCapacity: number) => {
        try {
            await updateDoc(doc(db, 'tables', tableId), {
                capacidad: newCapacity,
                updated_at: Timestamp.now()
            });

            setTables(tables.map(t =>
                t.id === tableId ? { ...t, capacidad: newCapacity } : t
            ));
        } catch (error) {
            console.error('Error updating capacity:', error);
            toast.error('Error al actualizar capacidad');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Cargando configuración...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/mozo')}
                        className="mb-2 text-zinc-500 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al Salón
                    </Button>
                    <h1 className="text-3xl font-bold text-gold">Configuración de Mesas</h1>
                    <p className="text-zinc-500">Define la cantidad y capacidad de las mesas</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configuration Panel */}
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-gold">Generar Mesas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="num-tables">Cantidad de Mesas</Label>
                            <Input
                                id="num-tables"
                                type="number"
                                min="1"
                                max="100"
                                value={numberOfTables}
                                onChange={(e) => setNumberOfTables(parseInt(e.target.value) || 1)}
                                className="bg-muted border-border mt-2"
                            />
                        </div>

                        <div>
                            <Label htmlFor="default-capacity">Capacidad por Defecto (personas)</Label>
                            <Input
                                id="default-capacity"
                                type="number"
                                min="1"
                                max="20"
                                value={defaultCapacity}
                                onChange={(e) => setDefaultCapacity(parseInt(e.target.value) || 1)}
                                className="bg-muted border-border mt-2"
                            />
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={saving}
                            className="w-full bg-gold hover:bg-yellow-500 text-black font-bold"
                        >
                            {saving ? 'Creando...' : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    {tables.length > 0 ? 'Regenerar Mesas' : 'Crear Mesas'}
                                </>
                            )}
                        </Button>

                        {tables.length > 0 && (
                            <p className="text-xs text-zinc-500 text-center">
                                Esto reemplazará las {tables.length} mesas actuales
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Current Tables */}
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardHeader>
                        <CardTitle>Mesas Configuradas ({tables.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tables.length === 0 ? (
                            <p className="text-center text-zinc-600 py-8">
                                No hay mesas configuradas.
                                <br />
                                Usa el panel de la izquierda para crearlas.
                            </p>
                        ) : (
                            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {tables.map((table) => (
                                    <div
                                        key={table.id}
                                        className="flex items-center justify-between p-3 bg-card rounded-xl border border-border"
                                    >
                                        <div>
                                            <p className="font-bold text-white">Mesa {table.numero}</p>
                                            <p className="text-xs text-zinc-500">ID: {table.id.slice(0, 8)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min="1"
                                                max="20"
                                                value={table.capacidad}
                                                onChange={(e) => handleUpdateCapacity(table.id, parseInt(e.target.value) || 1)}
                                                className="w-16 text-center bg-zinc-800 border-zinc-700"
                                            />
                                            <span className="text-xs text-zinc-500 w-16">personas</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
