'use client';

import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    Timestamp,
    doc,
    runTransaction,
    orderBy
} from 'firebase/firestore';
import {
    History,
    DollarSign,
    Calendar,
    ArrowUpCircle,
    ArrowDownCircle,
    X,
    Download,
    Printer
} from 'lucide-react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { AccountBalanceTicket } from '@/components/pos/AccountBalanceTicket';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase/config';
import { Customer, Sale, Payment } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface CustomerDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
}

export function CustomerDetailDialog({ isOpen, onClose, customer }: CustomerDetailDialogProps) {
    const { user } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastPaymentAmount, setLastPaymentAmount] = useState<number | undefined>(undefined);
    
    const ticketRef = useRef<HTMLDivElement>(null);
    const businessData = {
        nombre: 'TiendaLink',
        cuit: '30-11223344-9',
        direccion: 'Sede Central',
        telefono: '1122334455'
    };

    const handlePrintTicket = useReactToPrint({
        contentRef: ticketRef,
    });

    useEffect(() => {
        if (!customer) return;

        // Load sales where this customer was used
        const qSales = query(
            collection(db, 'sales'),
            where('cliente_id', '==', customer.id),
            orderBy('fecha', 'desc')
        );
        const unsubscribeSales = onSnapshot(qSales, (snapshot) => {
            setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[]);
        });

        // Load payments from this customer
        const qPayments = query(
            collection(db, 'payments'),
            where('cliente_id', '==', customer.id),
            orderBy('fecha', 'desc')
        );
        const unsubscribePayments = onSnapshot(qPayments, (snapshot) => {
            setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[]);
        });

        return () => {
            unsubscribeSales();
            unsubscribePayments();
        };
    }, [customer]);

    const handleRegisterPayment = async () => {
        if (!customer || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

        setLoading(true);
        try {
            await runTransaction(db, async (transaction) => {
                const amount = parseFloat(paymentAmount);

                // 1. Create Payment Record
                const paymentRef = doc(collection(db, 'payments'));
                transaction.set(paymentRef, {
                    cliente_id: customer.id,
                    monto: amount,
                    fecha: Timestamp.now(),
                    metodo_pago: 'efectivo', // Default to cash for now
                    usuario_id: user?.id || 'unknown',
                    nota: paymentNote,
                    created_at: Timestamp.now()
                });

                // 2. Update Customer Balance
                const customerRef = doc(db, 'customers', customer.id);
                const currentSaldo = customer.saldo_cuenta_corriente || 0;
                transaction.update(customerRef, {
                    saldo_cuenta_corriente: currentSaldo + amount, // Balance increases (recovers from negative debt)
                    updated_at: Timestamp.now()
                });
            });

            const amountRegistered = parseFloat(paymentAmount);
            setLastPaymentAmount(amountRegistered);
            setIsPaymentDialogOpen(false);
            setPaymentAmount('');
            setPaymentNote('');
            
            // Disparar la impresión automáticamente tras un abono
            setTimeout(() => {
                handlePrintTicket();
            }, 300);
        } catch (error) {
            console.error('Error registering payment:', error);
            alert('Error al registrar el pago');
        } finally {
            setLoading(false);
        }
    };

    if (!customer) return null;

    // Combine and sort all movements (Sales and Payments)
    const movements = [
        ...sales.map(s => ({
            id: s.id,
            fecha: s.fecha,
            tipo: 'venta',
            monto: -s.total, // Debt is negative
            descripcion: `Venta #${s.numero_comprobante || s.id.slice(0, 8)}`,
            metodo: s.metodo_pago
        })),
        ...payments.map(p => ({
            id: p.id,
            fecha: p.fecha,
            tipo: 'pago',
            monto: p.monto, // Payment is positive
            descripcion: p.nota || 'Abono a cuenta',
            metodo: p.metodo_pago
        }))
    ].sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-0 overflow-hidden bg-card border-border">
                    <DialogHeader className="p-6 border-b border-gold/10 bg-muted/50">
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle className="text-2xl font-bold text-gold">
                                    {customer.nombre}
                                </DialogTitle>
                                <p className="text-sm text-muted-foreground mt-1">Historial de Cuenta Corriente</p>
                            </div>
                            <Badge className={customer.saldo_cuenta_corriente < 0 ? 'bg-red-500/20 text-red-500 border-red-500/30 text-lg py-1 px-3' : 'bg-green-500/20 text-green-500 border-green-500/30 text-lg py-1 px-3'}>
                                Saldo: {formatCurrency(customer.saldo_cuenta_corriente)}
                            </Badge>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-muted/50 border-border">
                                <CardContent className="pt-4 pb-2">
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Límite de Crédito</p>
                                    <p className="text-lg font-bold text-foreground">{formatCurrency(customer.limite_credito)}</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-muted/50 border-border">
                                <CardContent className="pt-4 pb-2">
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Disponible</p>
                                    <p className="text-lg font-bold text-green-500">
                                        {formatCurrency(customer.limite_credito + customer.saldo_cuenta_corriente)}
                                    </p>
                                </CardContent>
                            </Card>
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="gold"
                                    className="w-full flex-row items-center justify-center gap-2 h-10"
                                    onClick={() => setIsPaymentDialogOpen(true)}
                                >
                                    <DollarSign className="w-4 h-4" />
                                    <span>Registrar Pago</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full flex-row items-center justify-center gap-2 h-10 border-primary/20 text-primary hover:bg-primary/10"
                                    onClick={() => {
                                        setLastPaymentAmount(undefined);
                                        setTimeout(() => handlePrintTicket(), 100);
                                    }}
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>Imprimir Saldo</span>
                                </Button>
                            </div>
                        </div>

                        {/* Movement Table */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-gold">
                                <History className="w-5 h-5" />
                                Movimientos Recientes
                            </h3>
                            <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/80 text-muted-foreground">
                                        <tr>
                                            <th className="text-left p-3">Fecha</th>
                                            <th className="text-left p-3">Descripción</th>
                                            <th className="text-right p-3">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {movements.map((move) => (
                                            <tr key={move.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-3 text-muted-foreground">
                                                    {format(move.fecha.toDate(), "dd/MM/yyyy HH:mm", { locale: es })}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        {move.tipo === 'pago' ? (
                                                            <ArrowUpCircle className="w-4 h-4 text-green-500" />
                                                        ) : (
                                                            <ArrowDownCircle className="w-4 h-4 text-red-500" />
                                                        )}
                                                        <span className="font-medium text-foreground">{move.descripcion}</span>
                                                    </div>
                                                </td>
                                                <td className={cn(
                                                    "p-3 text-right font-bold",
                                                    move.monto > 0 ? "text-green-500" : "text-red-500"
                                                )}>
                                                    {move.monto > 0 ? '+' : ''}{formatCurrency(move.monto)}
                                                </td>
                                            </tr>
                                        ))}
                                        {movements.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-8 text-center text-muted-foreground">
                                                    No hay movimientos registrados para este cliente.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-4 border-t border-gold/10 bg-muted/50">
                        <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                            Cerrar Detalle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sub-Dialog for Registering Payment */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-gold">Registrar Abono a Cuenta</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Monto del Pago ($)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="bg-background border-border text-foreground"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="note">Nota / Observación</Label>
                            <Input
                                id="note"
                                placeholder="Ej: Pago parcial efectivo"
                                value={paymentNote}
                                onChange={(e) => setPaymentNote(e.target.value)}
                                className="bg-background border-border text-foreground"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPaymentDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="gold"
                            onClick={handleRegisterPayment}
                            disabled={loading || !paymentAmount}
                        >
                            {loading ? 'Cargando...' : 'Confirmar Pago'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ticket de Saldo Oculto para Impresión */}
            <div className="hidden">
                <AccountBalanceTicket
                    ref={ticketRef}
                    customer={customer}
                    businessData={businessData}
                    paymentAmount={lastPaymentAmount}
                />
            </div>
        </>
    );
}
