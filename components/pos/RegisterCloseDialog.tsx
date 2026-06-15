'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Banknote, CreditCard, Smartphone, UserCircle, Calculator, FileText, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import { useReactToPrint } from 'react-to-print';
import { RegisterCloseReceipt } from '@/components/fiscal/RegisterCloseReceipt';

interface RegisterCloseDialogProps {
    isOpen: boolean;
    onClose: () => void;
    salesSummary: {
        efectivo: number;
        tarjeta_debito: number;
        tarjeta_credito: number;
        transferencia: number;
        cuenta_corriente: number;
        total: number;
    };
    currentSessionId?: string;
    initialAmount?: number;
    cajeroNombre?: string;
}

export function RegisterCloseDialog({
    isOpen,
    onClose,
    salesSummary,
    currentSessionId,
    initialAmount = 0,
    cajeroNombre = 'Cajero'
}: RegisterCloseDialogProps) {
    const { user } = useAuth();
    const [cashCounted, setCashCounted] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const receiptRef = React.useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
    });

    // Difference = Counted - (Initial + Sales Cash)
    const expectedCash = initialAmount + salesSummary.efectivo;
    const difference = parseFloat(cashCounted || '0') - expectedCash;

    const handleCloseRegister = async () => {
        setLoading(true);
        try {
            const closeData = {
                fecha_cierre: Timestamp.now(),
                // Keep the original cashier name in the record
                cerrada: true,
                efectivo_contado: parseFloat(cashCounted || '0'),
                diferencia: difference,
                notas: notes,

                // Also snapshots final sales
                ventas_efectivo: salesSummary.efectivo,
                ventas_tarjeta_debito: salesSummary.tarjeta_debito,
                ventas_tarjeta_credito: salesSummary.tarjeta_credito,
                ventas_transferencia: salesSummary.transferencia,
                ventas_cuenta_corriente: salesSummary.cuenta_corriente,
                total_ventas: salesSummary.total,
            };

            if (currentSessionId) {
                // Update existing session
                await updateDoc(doc(db, 'cash_registers', currentSessionId), closeData);
            }

            alert('Cierre de caja registrado exitosamente.');
            setCashCounted('');
            setNotes('');
            onClose();
        } catch (error) {
            console.error('Error closing register:', error);
            alert('Error al registrar el cierre de caja');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Calculator className="w-6 h-6 text-primary" />
                        Cierre de Caja - DataSense Food
                    </DialogTitle>
                    <DialogDescription className="flex items-center justify-between">
                        <span>Resumen de ventas del turno actual y arqueo de efectivo.</span>
                        <Badge variant="outline" className="text-primary border-primary/20">
                            Cajero: {cajeroNombre}
                        </Badge>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-accent/30 rounded-lg flex items-center gap-3 col-span-2 sm:col-span-1">
                            <Banknote className="w-5 h-5 text-green-500" />
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground uppercase">Efectivo Total</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="font-bold text-lg">{formatCurrency(initialAmount + salesSummary.efectivo)}</p>
                                    <span className="text-xs text-muted-foreground">
                                        (Ini: {formatCurrency(initialAmount)} + Vtas: {formatCurrency(salesSummary.efectivo)})
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-accent/30 rounded-lg flex items-center gap-3 sm:col-span-1">
                            <CreditCard className="w-5 h-5 text-blue-500" />
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">T. Débito</p>
                                <p className="font-bold">{formatCurrency(salesSummary.tarjeta_debito)}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-accent/30 rounded-lg flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-purple-500" />
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">T. Crédito</p>
                                <p className="font-bold">{formatCurrency(salesSummary.tarjeta_credito)}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-accent/30 rounded-lg flex items-center gap-3">
                            <Smartphone className="w-5 h-5 text-orange-500" />
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Transf.</p>
                                <p className="font-bold">{formatCurrency(salesSummary.transferencia)}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-accent/30 rounded-lg flex items-center gap-3">
                            <UserCircle className="w-5 h-5 text-pink-500" />
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Cta. Cte.</p>
                                <p className="font-bold">{formatCurrency(salesSummary.cuenta_corriente)}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-3">
                            <Calculator className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-xs text-primary uppercase font-semibold">Total Ventas</p>
                                <p className="font-bold text-lg">{formatCurrency(salesSummary.total)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="cash-counted">Efectivo en Caja (Arqueo Manual)</Label>
                            <Input
                                id="cash-counted"
                                type="number"
                                placeholder="Ingrese el monto físico..."
                                value={cashCounted}
                                onChange={(e) => setCashCounted(e.target.value)}
                                className="text-xl h-12"
                            />
                        </div>

                        {cashCounted && (
                            <div className={`p-4 rounded-lg border animate-in fade-in zoom-in duration-200 ${difference === 0 ? 'bg-green-500/10 border-green-500/20' : difference > 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground">Diferencia de Arqueo:</span>
                                    <span className={`font-bold text-2xl ${difference >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {formatCurrency(difference)}
                                    </span>
                                </div>
                                {difference !== 0 && (
                                    <p className="text-[10px] uppercase mt-1 text-center opacity-60">
                                        {difference > 0 ? 'Sobrante de caja' : 'Faltante de caja'}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-muted-foreground flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Notas / Observaciones
                            </Label>
                            <Textarea
                                id="notes"
                                placeholder="Escribe aquí cualquier novedad del turno..."
                                value={notes}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                                className="bg-muted border-border text-foreground min-h-[80px]"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between items-center sm:justify-between">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                        <Button
                            variant="outline"
                            onClick={() => handlePrint()}
                            disabled={!cashCounted}
                            className="bg-muted hover:bg-accent text-foreground border-border"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir
                        </Button>
                    </div>
                    <Button variant="primary" onClick={handleCloseRegister} disabled={loading || !cashCounted} className="px-8 shadow-md">
                        {loading ? 'Registrando...' : 'Confirmar Cierre'}
                    </Button>
                </DialogFooter>

                {/* Hidden Receipt for Printing */}
                <div className="hidden">
                    <RegisterCloseReceipt
                        ref={receiptRef}
                        summary={salesSummary}
                        cashCounted={parseFloat(cashCounted || '0')}
                        initialAmount={initialAmount}
                        difference={difference}
                        notes={notes}
                        user={{ nombre: cajeroNombre }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
