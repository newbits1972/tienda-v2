'use client';

import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

interface PriceUpdateReportProps {
    category: string;
    updateType: 'percent' | 'fixed';
    amount: string;
    rounding: string;
    products: { id: string, nombre: string, original: number, nuevo: number }[];
}

export const PriceUpdateReport = forwardRef<HTMLDivElement, PriceUpdateReportProps>(
    ({ category, updateType, amount, rounding, products }, ref) => {
        const date = new Date();
        const value = parseFloat(amount);

        return (
            <div
                ref={ref}
                className="bg-white text-black p-8 font-sans text-sm print:p-4"
                style={{ width: '210mm', minHeight: '297mm' }} // A4 size
            >
                {/* Header */}
                <div className="text-center border-b-2 border-black pb-4 mb-6">
                    <h1 className="text-2xl font-bold uppercase tracking-wider">Reporte de Actualización de Precios</h1>
                    <p className="text-sm mt-1">
                        Generado el {format(date, "dd 'de' MMMM 'de' yyyy, HH:mm'hs'", { locale: es })}
                    </p>
                </div>

                {/* Configuration Summary */}
                <div className="bg-gray-100 p-4 rounded-lg mb-6 border border-gray-300">
                    <h2 className="font-bold text-lg mb-2 border-b border-gray-400 pb-1">Configuración del Ajuste</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <p><span className="font-semibold">Categoría:</span> {category === 'all' ? 'Todas las categorías' : category}</p>
                        <p>
                            <span className="font-semibold">Ajuste Aplicado:</span>{' '}
                            {updateType === 'percent' ? `${value}%` : `$${value}`}
                        </p>
                        <p>
                            <span className="font-semibold">Redondeo:</span>{' '}
                            {rounding === 'none' ? 'Sin redondeo' : `Al múltiplo de ${rounding}`}
                        </p>
                        <p><span className="font-semibold">Cantidad de Productos:</span> {products.length}</p>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-800 text-white leading-normal">
                            <th className="py-3 px-4 text-left border border-gray-600">Producto</th>
                            <th className="py-3 px-4 text-right border border-gray-600">Precio Actual</th>
                            <th className="py-3 px-4 text-right border border-gray-600">Precio Nuevo</th>
                            <th className="py-3 px-4 text-center border border-gray-600">Dif. %</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-800">
                        {products.map((p, index) => {
                            const diff = ((p.nuevo - p.original) / p.original) * 100;
                            return (
                                <tr key={p.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="py-2 px-4 border border-gray-300">{p.nombre}</td>
                                    <td className="py-2 px-4 border border-gray-300 text-right">{formatCurrency(p.original)}</td>
                                    <td className="py-2 px-4 border border-gray-300 text-right font-bold">{formatCurrency(p.nuevo)}</td>
                                    <td className={`py-2 px-4 border border-gray-300 text-center font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="mt-12 pt-4 border-t border-gray-400 flex justify-between text-xs italic text-gray-500">
                    <p>Fiambrería Pro - Sistema de Gestión ERP</p>
                    <p>Página 1 de 1</p>
                </div>
            </div>
        );
    }
);

PriceUpdateReport.displayName = 'PriceUpdateReport';
