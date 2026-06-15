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
    onConfirm: (paymentMethod: PaymentMethod, invoiceType: InvoiceType, customerId?: string) => void;
    customers: Customer[];
    cartItems: any[];
}

export function CheckoutDialog({ isOpen, total, onClose, onConfirm, customers, cartItems }: CheckoutDialogProps) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
    const [invoiceType, setInvoiceType] = useState<InvoiceType>('ticket');
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [cashReceived, setCashReceived] = useState('');
    const { isModuleActive } = useModuleStatus();

    const change = paymentMethod === 'efectivo'
        ? Math.max(0, parseFloat(cashReceived || '0') - total)
        : 0;

    const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
        { value: 'efectivo', label: 'Efectivo', icon: <Banknote className="w-5 h-5" /> },
        { value: 'tarjeta_debito', label: 'Débito', icon: <CreditCard className="w-5 h-5" /> },
        { value: 'tarjeta_credito', label: 'Crédito', icon: <CreditCard className="w-5 h-5" /> },
        { value: 'transferencia', label: 'Transferencia', icon: <Smartphone className="w-5 h-5" /> },
        { value: 'mercado_pago', label: 'Mercado Pago', icon: <QrCode className="w-5 h-5" /> },
        { value: 'cuenta_corriente', label: 'Cuenta Corriente', icon: <UserCircle className="w-5 h-5" /> },
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

        if (paymentMethod === 'efectivo' && parseFloat(cashReceived || '0') < total) {
            alert('El monto recibido es menor al total');
            return;
        }

        onConfirm(paymentMethod, invoiceType, selectedCustomer || undefined);

        // Reset
        setPaymentMethod('efectivo');
        setInvoiceType('ticket');
        setSelectedCustomer('');
        setCashReceived('');
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
                        Total a cobrar: <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Payment Method Selection */}
                    <div>
                        <label className="text-sm font-medium mb-2 block text-muted-foreground uppercase tracking-widest text-[10px] font-black">Método de Pago</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {paymentMethods
                                .filter(method => !['tarjeta_debito', 'tarjeta_credito'].includes(method.value))
                                .map((method) => (
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
                            total={total}
                            items={cartItems}
                            onSuccess={(id) => {
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
                            Cobrar {formatCurrency(total)} (F8)
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
