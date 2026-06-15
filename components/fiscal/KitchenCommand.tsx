'use client';

import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Order } from '@/lib/types';
import { toDate } from '@/lib/utils';

interface KitchenCommandProps {
    order: Order;
}

export const KitchenCommand = forwardRef<HTMLDivElement, KitchenCommandProps>(
    ({ order }, ref) => {
        return (
            <div
                ref={ref}
                className="bg-white text-black p-4 font-mono w-[80mm] max-w-[80mm]"
            >
                {/* Header / Order Type */}
                <div className="text-center border-b-4 border-black pb-2 mb-4">
                    <h1 className="text-2xl font-black uppercase tracking-tighter">
                        COMANDA: {order.type === 'salon' ? `MESA ${order.mesa}` : order.type.toUpperCase()}
                    </h1>
                    <p className="text-sm font-bold mt-1">
                        #{order.id.slice(-6).toUpperCase()}
                    </p>
                </div>

                {/* Date and Time */}
                <div className="flex justify-between text-xs font-bold mb-4 border-b border-dashed border-black pb-2">
                    <span>{format(toDate(order.fecha), 'dd/MM/yyyy')}</span>
                    <span>{format(toDate(order.fecha), 'HH:mm')} hs</span>
                </div>

                {/* Customer Info for Delivery/Counter */}
                {(order.cliente_nombre || order.direccion_entrega) && (
                    <div className="mb-4 bg-gray-100 p-2 border-l-4 border-black">
                        {order.cliente_nombre && (
                            <p className="text-sm font-black uppercase">Cliente: {order.cliente_nombre}</p>
                        )}
                        {order.direccion_entrega && (
                            <p className="text-xs font-bold mt-1">DIR: {order.direccion_entrega}</p>
                        )}
                        {order.cliente_telefono && (
                            <p className="text-xs">TEL: {order.cliente_telefono}</p>
                        )}
                    </div>
                )}

                {/* Items - BIG FONT FOR KITCHEN */}
                <div className="mb-4">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="text-left text-xs uppercase">Cant.</th>
                                <th className="text-left text-xs uppercase">Producto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, index) => (
                                <tr key={index} className="border-b border-gray-300">
                                    <td className="py-3 text-xl font-black align-top w-16">
                                        {item.producto.es_pesable
                                            ? `${((item.peso_gramos || 0) / 1000).toFixed(3)}kg`
                                            : `${item.cantidad} x`}
                                    </td>
                                    <td className="py-3 text-lg font-bold leading-tight">
                                        {item.producto.nombre}
                                        {/* Variants & Extras in command */}
                                        {item.selectedVariants && Object.values(item.selectedVariants).map((v: any, i) => (
                                            <div key={i} className="text-sm font-normal text-gray-700 ml-2">
                                                - {v.nombre}
                                            </div>
                                        ))}
                                        {item.selectedExtras && item.selectedExtras.map((e: any, i) => (
                                            <div key={i} className="text-sm font-normal text-gray-700 ml-2">
                                                + EXTRA {e.nombre}
                                            </div>
                                        ))}
                                        {item.notas && (
                                            <div className="text-sm italic font-bold text-black bg-yellow-100 p-1 mt-1 rounded">
                                                NOTA: {item.notas}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Global Notes */}
                {order.notas && (
                    <div className="mt-4 border-2 border-black p-3 rounded-lg overflow-hidden">
                        <p className="text-[10px] font-black uppercase mb-1">Observaciones Generales:</p>
                        <p className="text-lg font-black leading-none">{order.notas}</p>
                    </div>
                )}

                {/* Footer for Kitchen */}
                <div className="text-center mt-8 pt-4 border-t-4 border-black">
                    <div className="inline-block border-2 border-black px-4 py-1 font-black text-xl">
                        {order.status === 'pending_kitchen' ? 'PENDIENTE' : 'COCINANDO'}
                    </div>
                </div>
            </div>
        );
    }
);

KitchenCommand.displayName = 'KitchenCommand';
