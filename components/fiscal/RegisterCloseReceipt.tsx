'use client';

import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

interface RegisterCloseReceiptProps {
    summary: {
        efectivo: number;
        tarjeta_debito: number;
        tarjeta_credito: number;
        transferencia: number;
        cuenta_corriente: number;
        total: number;
    };
    cashCounted: number;
    initialAmount: number;
    difference: number;
    notes?: string;
    user?: {
        nombre: string;
    };
}

export const RegisterCloseReceipt = forwardRef<HTMLDivElement, RegisterCloseReceiptProps>(
    ({ summary, cashCounted, initialAmount, difference, notes, user }, ref) => {
        return (
            <div
                ref={ref}
                className="bg-white text-black p-4 font-mono text-sm"
                style={{ width: '80mm', maxWidth: '80mm' }}
            >
                <div className="text-center border-b-2 border-black pb-2 mb-2">
                    <h1 className="text-lg font-bold uppercase">Cierre de Caja</h1>
                    <p className="text-xs">DataSense Food</p>
                </div>

                <div className="text-xs mb-4">
                    <p>Fecha: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                    <p>Cajero: {user?.nombre || 'Usuario'}</p>
                </div>

                <div className="border-b border-black pb-2 mb-2">
                    <h2 className="font-bold border-b border-dashed border-gray-400 mb-1">RESUMEN DE VENTAS</h2>
                    <div className="flex justify-between">
                        <span>EFECTIVO VENTAS:</span>
                        <span>{formatCurrency(summary.efectivo)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>T. DEBITO:</span>
                        <span>{formatCurrency(summary.tarjeta_debito)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>T. CREDITO:</span>
                        <span>{formatCurrency(summary.tarjeta_credito)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>TRANSF.:</span>
                        <span>{formatCurrency(summary.transferencia)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>CTA. CTE.:</span>
                        <span>{formatCurrency(summary.cuenta_corriente)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-black mt-1 pt-1 text-base">
                        <span>TOTAL VENTAS:</span>
                        <span>{formatCurrency(summary.total)}</span>
                    </div>
                </div>

                <div className="border-b border-black pb-2 mb-2">
                    <h2 className="font-bold border-b border-dashed border-gray-400 mb-1">ARQUEO DE FÍSICO</h2>
                    <div className="flex justify-between">
                        <span>FONDO INICIAL:</span>
                        <span>{formatCurrency(initialAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>EFECTIVO VENTAS:</span>
                        <span>{formatCurrency(summary.efectivo)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-gray-400 mt-1 pt-1 italic">
                        <span>EFECTIVO ESPERADO:</span>
                        <span>{formatCurrency(initialAmount + summary.efectivo)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                        <span>EFECTIVO CONTADO:</span>
                        <span>{formatCurrency(cashCounted)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-gray-400 mt-1 pt-1 font-bold">
                        <span>DIFERENCIA:</span>
                        <span className={difference < 0 ? 'text-red-600' : ''}>{formatCurrency(difference)}</span>
                    </div>
                </div>

                {notes && (
                    <div className="mb-4 text-xs">
                        <p className="font-bold">NOTAS:</p>
                        <p className="italic">{notes}</p>
                    </div>
                )}

                <div className="mt-8 pt-4 border-t border-dashed border-black">
                    <div className="flex justify-between text-[10px]">
                        <div className="text-center w-1/2">
                            <div className="border-t border-black mx-2 pt-1">Firma Cajero</div>
                        </div>
                        <div className="text-center w-1/2">
                            <div className="border-t border-black mx-2 pt-1">Firma Encargado</div>
                        </div>
                    </div>
                </div>

                <div className="text-center text-[10px] mt-8 text-gray-500">
                    <p>Fin de turno registrado en sistema</p>
                </div>
            </div>
        );
    }
);

RegisterCloseReceipt.displayName = 'RegisterCloseReceipt';
