'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Smartphone, UserCircle, Receipt, QrCode } from 'lucide-react';
import { MPPaymentFlow } from './MPPaymentFlow';
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
import { Badge } from '@/components/ui/badge';
import { PaymentMethod, InvoiceType, Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useModuleStatus } from '@/hooks/useModuleStatus';

interface CheckoutDialogProps {
    isOpen: boolean;
    total: number;
    onClose: () => void;
    onConfirm: (paymentMethod: PaymentMethod, invoiceType: InvoiceType, customerId?: string, totalFinal?: number) => void;
    customers: Customer[];
    cartItems: any[];
}

export function CheckoutDialog({ isOpen, total, onClose, onConfirm, customers, cartItems }: CheckoutDialogProps) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
    const [invoiceType, setInvoiceType] = useState<InvoiceType>('ticket');
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [cashReceived, setCashReceived] = useState('');
    const [cuotas, setCuotas] = useState<number>(1);
    const [descuentoEfectivo, setDescuentoEfectivo] = useState<boolean>(true);
    const { isModuleActive } = useModuleStatus();

    // Resetear opciones cuando cambia el método de pago
    useEffect(() => {
        setCuotas(1);
        setCashReceived('');
    }, [paymentMethod]);

    // Lógica de cálculo de descuentos / recargos
    let descuentoPorcentaje = 0;
    let recargoPorcentaje = 0;

    if ((paymentMethod === 'efectivo' || paymentMethod === 'transferencia') && descuentoEfectivo) {
        descuentoPorcentaje = 10; // 10% de descuento automático en caja
    } else if (paymentMethod === 'tarjeta_credito') {
        if (cuotas === 3) recargoPorcentaje = 15; // 15% recargo en 3 cuotas
        else if (cuotas === 6) recargoPorcentaje = 28; // 28% recargo en 6 cuotas
    }

    const descuentoMonto = total * (descuentoPorcentaje / 100);
    const recargoMonto = total * (recargoPorcentaje / 100);
    const totalFinal = Math.max(0, total - descuentoMonto + recargoMonto);

    const change = paymentMethod === 'efectivo'
        ? Math.max(0, parseFloat(cashReceived || '0') - totalFinal)
        : 0;

    const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
        { value: 'efectivo', label: 'Efectivo', icon: <Banknote className="w-5 h-5" /> },
        { value: 'tarjeta_debito', label: 'Débito (Posnet)', icon: <CreditCard className="w-5 h-5" /> },
        { value: 'tarjeta_credito', label: 'Crédito (Posnet)', icon: <CreditCard className="w-5 h-5" /> },
        { value: 'transferencia', label: 'Transferencia', icon: <Smartphone className="w-5 h-5" /> },
        { value: 'mercado_pago', label: 'MP (QR)', icon: <QrCode className="w-5 h-5" /> },
        { value: 'cuenta_corriente', label: 'Cta. Corriente', icon: <UserCircle className="w-5 h-5" /> },
    ];

    const invoiceTypes: { value: InvoiceType; label: string }[] = [
        { value: 'ticket', label: 'Ticket' },
        ...(isModuleActive('afip_fiscal') ? [
            { value: 'factura_b' as InvoiceType, label: 'Factura B' },
            { value: 'factura_a' as InvoiceType, label: 'Factura A' },
        ] : []),
    ];

    const handleConfirm = () => {
        if (paymentMethod === 'cuenta_corriente' && !selectedCustomer) {
            alert('Selecciona un cliente para cuenta corriente');
            return;
        }

        if (invoiceType === 'factura_a' && !selectedCustomer) {
            alert('Se requiere un cliente con CUIT para emitir Factura A');
            return;
        }

        const customer = customers.find(c => c.id === selectedCustomer);
        if (invoiceType === 'factura_a' && customer && (!customer.dni_cuit || customer.dni_cuit.replace(/\D/g, '').length !== 11)) {
            alert('El cliente seleccionado debe tener un CUIT válido (11 dígitos) para Factura A');
            return;
        }

        if (paymentMethod === 'efectivo' && parseFloat(cashReceived || '0') < totalFinal) {
            alert('El monto recibido es menor al total de la venta');
            return;
        }

        onConfirm(paymentMethod, invoiceType, selectedCustomer || undefined, totalFinal);

        // Reset
        setPaymentMethod('efectivo');
        setInvoiceType('ticket');
        setSelectedCustomer('');
        setCashReceived('');
        setCuotas(1);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto text-foreground bg-background border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Receipt className="w-6 h-6 text-primary" />
                        Finalizar Venta
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Total Original: <span className="font-semibold">{formatCurrency(total)}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Payment Method Selection */}
                    <div>
                        <label className="text-sm font-medium mb-2 block text-muted-foreground uppercase tracking-widest text-[10px] font-black">Método de Pago</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {paymentMethods.map((method) => (
                                <Button
                                    key={method.value}
                                    variant={paymentMethod === method.value ? 'primary' : 'outline'}
                                    onClick={() => setPaymentMethod(method.value)}
                                    className={`flex items-center gap-2 h-auto py-3 ${paymentMethod === method.value ? '' : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                                >
                                    {method.icon}
                                    <span>{method.label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Descuentos o Recargos Dinámicos */}
                    {(paymentMethod === 'efectivo' || paymentMethod === 'transferencia') && (
                        <div className="flex items-center justify-between bg-muted/40 p-4 rounded-xl border border-border animate-in fade-in slide-in-from-top-2">
                            <div>
                                <p className="text-xs font-bold uppercase text-muted-foreground">Descuento de Pago Inmediato</p>
                                <p className="text-[10px] text-green-500 font-black">10% OFF aplicando Efectivo/Transferencia</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={descuentoEfectivo}
                                onChange={(e) => setDescuentoEfectivo(e.target.checked)}
                                className="h-5 w-5 rounded border-border text-primary accent-primary cursor-pointer"
                            />
                        </div>
                    )}

                    {paymentMethod === 'tarjeta_credito' && (
                        <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-3 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-[10px] font-black block">Planes de Cuotas</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 1, label: '1 Pago (0%)', recargo: 0 },
                                    { value: 3, label: '3 Cuotas (+15%)', recargo: 15 },
                                    { value: 6, label: '6 Cuotas (+28%)', recargo: 28 }
                                ].map((plan) => (
                                    <Button
                                        key={plan.value}
                                        type="button"
                                        variant={cuotas === plan.value ? 'primary' : 'outline'}
                                        onClick={() => setCuotas(plan.value)}
                                        className="h-10 text-xs font-bold"
                                    >
                                        {plan.label}
                                    </Button>
                                ))}
                            </div>
                            {cuotas > 1 && (
                                <p className="text-xs text-primary/70 font-bold">
                                    Monto por cuota: {formatCurrency(totalFinal / cuotas)} (incluye recargo financiero)
                                </p>
                            )}
                        </div>
                    )}

                    {/* Resumen de Ajustes de Caja */}
                    {(descuentoMonto > 0 || recargoMonto > 0) && (
                        <div className="bg-muted/20 p-4 rounded-xl border border-border/50 text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Bruto:</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                            {descuentoMonto > 0 && (
                                <div className="flex justify-between text-green-500 font-medium">
                                    <span>Descuento (10% OFF):</span>
                                    <span>-{formatCurrency(descuentoMonto)}</span>
                                </div>
                            )}
                            {recargoMonto > 0 && (
                                <div className="flex justify-between text-amber-500 font-medium">
                                    <span>Recargo Financiero ({recargoPorcentaje}%):</span>
                                    <span>+{formatCurrency(recargoMonto)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Invoice Type Selection */}
                    <div>
                        <label className="text-sm font-medium mb-2 block text-muted-foreground uppercase tracking-widest text-[10px] font-black">Tipo de Comprobante</label>
                        <div className="grid grid-cols-3 gap-2">
                            {invoiceTypes.map((type) => (
                                <Button
                                    key={type.value}
                                    variant={invoiceType === type.value ? 'primary' : 'outline'}
                                    onClick={() => setInvoiceType(type.value)}
                                    className={`h-auto py-3 ${invoiceType === type.value ? '' : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                                >
                                    {type.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Customer Selection for Cuenta Corriente OR Factura A/B */}
                    {(paymentMethod === 'cuenta_corriente' || invoiceType !== 'ticket') && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-[10px] font-black">
                                {invoiceType === 'factura_a' ? 'Cliente (Responsable Inscripto - Requiere CUIT)' : 'Cliente'}
                            </label>
                            <select
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                                className="w-full h-10 rounded-md border border-border bg-card text-foreground px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="">Seleccionar cliente...</option>
                                {customers.filter(c => c.activo).map((customer) => (
                                    <option key={customer.id} value={customer.id} className="bg-card text-foreground">
                                        {customer.nombre} {customer.dni_cuit ? `(${customer.dni_cuit})` : ''}
                                        {paymentMethod === 'cuenta_corriente' && ` - Saldo: ${formatCurrency(customer.saldo_cuenta_corriente)}`}
                                    </option>
                                ))}
                            </select>
                            {invoiceType === 'factura_a' && !selectedCustomer && (
                                <p className="text-xs text-primary/60">Factura A requiere identificación de CUIT del receptor.</p>
                            )}
                        </div>
                    )}

                    {/* Cash Input */}
                    {paymentMethod === 'efectivo' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-[10px] font-black">Efectivo Recibido</label>
                            <Input
                                type="number"
                                value={cashReceived}
                                onChange={(e) => setCashReceived(e.target.value)}
                                placeholder="0.00"
                                className="text-2xl h-14 bg-muted border-border text-foreground font-mono placeholder:text-muted-foreground/30 focus:border-primary"
                                autoFocus
                            />
                            {cashReceived && (
                                <div className="flex justify-between items-center p-4 bg-primary/10 border border-primary/20 rounded-lg">
                                    <span className="font-medium text-muted-foreground">Vuelto:</span>
                                    <span className="text-2xl font-bold text-primary">
                                        {formatCurrency(change)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mercado Pago Flow */}
                    {paymentMethod === 'mercado_pago' && (
                        <MPPaymentFlow
                            total={totalFinal}
                            items={cartItems}
                            onSuccess={() => {
                                handleConfirm();
                            }}
                            onCancel={() => setPaymentMethod('efectivo')}
                        />
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t border-border pt-6">
                    <Button variant="outline" onClick={onClose} className="border-border text-muted-foreground hover:text-foreground hover:bg-muted">
                        Cancelar (ESC)
                    </Button>
                    {paymentMethod !== 'mercado_pago' && (
                        <Button variant="primary" onClick={handleConfirm} className="text-lg px-8 shadow-primary/20">
                            Cobrar {formatCurrency(totalFinal)} (F8)
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
