'use client';

import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    increment,
    Timestamp
} from 'firebase/firestore';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Truck,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    DollarSign,
    Save
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Provider {
    id: string;
    nombre: string;
    cuit?: string;
    telefono: string;
    email: string;
    direccion: string;
    saldo: number;
}

interface Movement {
    id: string;
    tipo: 'compra' | 'pago';
    monto: number;
    fecha: any; // Timestamp
    referencia_id?: string;
}

interface ProviderDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    provider: Provider;
}

export function ProviderDetailDialog({ isOpen, onClose, provider }: ProviderDetailDialogProps) {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('history');

    // Payment Form
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentHigh, setPaymentHigh] = useState(false); // If payment is greater than debt? No, just loading state
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && provider) {
            const q = query(
                collection(db, 'provider_movements'),
                where('provider_id', '==', provider.id),
                orderBy('fecha', 'desc')
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                setMovements(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Movement[]);
                setLoading(false);
            });

            return () => unsubscribe();
        }
    }, [isOpen, provider]);

    const handleRegisterPayment = async () => {
        if (!paymentAmount || isNaN(parseFloat(paymentAmount))) return;

        const amount = parseFloat(paymentAmount);
        setIsSubmitting(true);

        try {
            // 1. Create Payment Movement
            await addDoc(collection(db, 'provider_movements'), {
                provider_id: provider.id,
                tipo: 'pago',
                monto: amount,
                fecha: Timestamp.now(),
                created_at: Timestamp.now()
            });

            // 2. Update Provider Balance
            // Payment increases the balance (making it less negative or positive)
            // If debt is -1000 and I pay 500, new balance is -500.
            // So we increment by amount.
            const providerRef = doc(db, 'providers', provider.id);
            await updateDoc(providerRef, {
                saldo: increment(amount),
                updated_at: Timestamp.now()
            });

            setPaymentAmount('');
            alert('Pago registrado correctamente.');
            setActiveTab('history'); // Switch back to history
        } catch (error) {
            console.error("Error registering payment:", error);
            alert("Error al registrar el pago.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 bg-card border-border">
                <DialogHeader className="p-6 border-b border-gold/10 bg-muted/50">
                    <DialogTitle className="text-2xl font-bold text-gold flex items-center gap-2">
                        <Truck className="w-6 h-6" />
                        {provider.nombre}
                    </DialogTitle>
                    <p className="text-muted-foreground text-sm flex gap-4">
                        <span>{provider.cuit}</span>
                        <span>{provider.telefono}</span>
                    </p>
                </DialogHeader>

                <div className="p-6 bg-muted/30 border-b border-border flex justify-between items-center">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider">Saldo Actual</p>
                        <p className={cn(
                            "text-3xl font-bold",
                            provider.saldo < 0 ? "text-red-500" : "text-green-500"
                        )}>
                            {formatCurrency(provider.saldo)}
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                            {provider.saldo < 0 ? "Le debes dinero" : "Saldo a favor"}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setActiveTab('payment')}
                        className="border-gold/30 text-gold hover:bg-gold/10"
                    >
                        <DollarSign className="w-4 h-4 mr-2" /> Nuevo Pago
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <div className="px-6 pt-4">
                            <TabsList className="bg-muted border-border">
                                <TabsTrigger value="history">Historial de Movimientos</TabsTrigger>
                                <TabsTrigger value="payment">Registrar Pago</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="history" className="flex-1 overflow-y-auto p-6">
                            {loading ? (
                                <p className="text-center text-muted-foreground">Cargando movimientos...</p>
                            ) : movements.length === 0 ? (
                                <p className="text-center text-muted-foreground">No hay movimientos registrados.</p>
                            ) : (
                                <div className="space-y-2">
                                    {movements.map(mov => (
                                        <div key={mov.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border hover:border-gold/20 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-full",
                                                    mov.tipo === 'compra' ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                                                )}>
                                                    {mov.tipo === 'compra' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground capitalize">{mov.tipo}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {format(mov.fecha.toDate(), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn(
                                                    "font-bold",
                                                    mov.tipo === 'compra' ? "text-red-400" : "text-green-400"
                                                )}>
                                                    {mov.tipo === 'compra' ? '-' : '+'}{formatCurrency(mov.monto)}
                                                </p>
                                                {mov.referencia_id && (
                                                    <p className="text-[10px] text-muted-foreground/60 font-mono">Ref: {mov.referencia_id.slice(0, 8)}...</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="payment" className="flex-1 p-6">
                            <div className="max-w-md mx-auto space-y-6 pt-8">
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-medium text-foreground">Registrar Pago a Proveedor</h3>
                                    <p className="text-muted-foreground text-sm">
                                        Ingresa el monto que abonaste a {provider.nombre} para descontar de la deuda.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Monto Abonado ($)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                                            <Input
                                                type="number"
                                                className="pl-8 text-lg bg-background border-border h-12"
                                                placeholder="0.00"
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-12 text-lg gap-2"
                                        variant="gold"
                                        onClick={handleRegisterPayment}
                                        disabled={isSubmitting || !paymentAmount}
                                    >
                                        {isSubmitting ? 'Registrando...' : (
                                            <>
                                                <Save className="w-5 h-5" /> Confirmar Pago
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        className="w-full text-muted-foreground"
                                        variant="ghost"
                                        onClick={() => setActiveTab('history')}
                                    >
                                        Volver al Historial
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
