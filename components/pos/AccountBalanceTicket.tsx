'use client';

import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface AccountBalanceTicketProps {
    customer: Customer;
    businessData: {
        nombre: string;
        cuit: string;
        direccion: string;
        telefono: string;
    };
    paymentAmount?: number; // Opcional, para cuando registra un abono en el momento
}

export const AccountBalanceTicket = forwardRef<HTMLDivElement, AccountBalanceTicketProps>(
    ({ customer, businessData, paymentAmount }, ref) => {
        const saldoAbsoluto = Math.abs(customer.saldo_cuenta_corriente);
        const estadoDeuda = customer.saldo_cuenta_corriente < 0;

        return (
            <div
                ref={ref}
                className="bg-white text-black p-4 font-mono text-xs"
                style={{ width: '80mm', maxWidth: '80mm' }}
            >
                {/* Header */}
                <div className="text-center border-b border-black pb-2 mb-2">
                    <h1 className="text-base font-bold uppercase">{businessData.nombre}</h1>
                    <p className="text-[10px]">CUIT: {businessData.cuit}</p>
                    <p className="text-[10px]">{businessData.direccion}</p>
                    {businessData.telefono && <p className="text-[10px]">Tel: {businessData.telefono}</p>}
                    <h2 className="text-sm font-bold uppercase mt-2 border border-black p-1">
                        Estado de Cuenta Corriente
                    </h2>
                </div>

                {/* Info Cliente */}
                <div className="mb-3 space-y-1">
                    <p className="font-bold uppercase">Cliente: {customer.nombre}</p>
                    {customer.dni_cuit && <p>DNI/CUIT: {customer.dni_cuit}</p>}
                    {customer.telefono && <p>Teléfono: {customer.telefono}</p>}
                    {customer.direccion && <p className="truncate">Dirección: {customer.direccion}</p>}
                    <p>Fecha Emisión: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                </div>

                {/* Detalles del pago (si fue invocado tras un abono) */}
                {paymentAmount !== undefined && paymentAmount > 0 && (
                    <div className="border-t border-b border-dashed border-black py-2 my-2 space-y-1">
                        <div className="flex justify-between font-bold text-sm">
                            <span>ENTREGA / ABONO:</span>
                            <span>{formatCurrency(paymentAmount)}</span>
                        </div>
                        <p className="text-[10px] text-gray-600 text-center">¡Abono registrado correctamente!</p>
                    </div>
                )}

                {/* Balance Actual */}
                <div className="border-t-2 border-black pt-2 mb-2 text-center">
                    <p className="text-xs uppercase font-bold text-gray-700">Estado de Saldo</p>
                    <div className="my-2 p-2 bg-gray-100 border border-gray-300 rounded">
                        {estadoDeuda ? (
                            <>
                                <p className="text-[10px] text-red-600 font-bold uppercase">SALDO DEUDOR (A PAGAR)</p>
                                <p className="text-xl font-black text-red-600">{formatCurrency(saldoAbsoluto)}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-[10px] text-green-600 font-bold uppercase">SALDO A FAVOR</p>
                                <p className="text-xl font-black text-green-600">{formatCurrency(saldoAbsoluto)}</p>
                            </>
                        )}
                    </div>
                    {customer.limite_credito > 0 && (
                        <p className="text-[9px] text-gray-500 uppercase">
                            Límite de Crédito: {formatCurrency(customer.limite_credito)}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center text-[10px] border-t border-black pt-2 mt-4 space-y-1">
                    <p>Este comprobante detalla el estado actual de tu cuenta corriente comercial.</p>
                    <p className="font-bold mt-2">¡Muchas gracias por su confianza!</p>
                </div>
            </div>
        );
    }
);

AccountBalanceTicket.displayName = 'AccountBalanceTicket';
