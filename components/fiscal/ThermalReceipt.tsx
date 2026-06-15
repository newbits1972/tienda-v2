'use client';

import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode';
import { Sale, Invoice } from '@/lib/types';
import { formatCurrency, toDate } from '@/lib/utils';
import { generateQRData } from '@/lib/fiscal/afipService';

interface ThermalReceiptProps {
    sale: Sale;
    invoice?: Invoice;
    businessData: {
        nombre: string;
        cuit: string;
        direccion: string;
        telefono: string;
        puntoVenta: number;
    };
}

export const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
    ({ sale, invoice, businessData }, ref) => {
        const [qrDataUrl, setQrDataUrl] = React.useState('');

        React.useEffect(() => {
            if (invoice && invoice.cae) {
                const qrData = generateQRData({
                    cuit: businessData.cuit,
                    puntoVenta: businessData.puntoVenta,
                    tipo: invoice.tipo === 'factura_a' ? 'A' : (invoice.tipo === 'factura_b' ? 'B' : 'T'),
                    numero: invoice.numero,
                    total: invoice.total,
                    fecha: format(toDate(invoice.fecha), 'yyyy-MM-dd'),
                    cae: invoice.cae,
                    receptor_cuit: invoice.tipo === 'factura_a' ? invoice.cliente_cuit : undefined
                });

                QRCode.toDataURL(qrData)
                    .then(setQrDataUrl)
                    .catch(console.error);
            }
        }, [invoice, businessData]);

        return (
            <div
                ref={ref}
                className="bg-white text-black p-4 font-mono text-sm"
                style={{ width: '80mm', maxWidth: '80mm' }}
            >
                {/* Header Business */}
                <div className="text-center border-b border-black pb-2 mb-2">
                    <h1 className="text-lg font-bold uppercase">{businessData.nombre}</h1>
                    <p className="text-xs">CUIT: {businessData.cuit}</p>
                    <p className="text-xs">{businessData.direccion}</p>
                    <p className="text-xs">Tel: {businessData.telefono}</p>
                </div>

                {/* Receiver Info (For Factura A/B) */}
                {invoice && invoice.cliente_nombre && (
                    <div className="text-xs mb-2 border-b border-dashed border-black pb-2">
                        <p className="font-bold uppercase">Cliente: {invoice.cliente_nombre}</p>
                        {invoice.cliente_cuit && <p>CUIT/DNI: {invoice.cliente_cuit}</p>}
                        <p>Cond. IVA: {invoice.tipo === 'factura_a' ? 'Resp. Inscripto' : 'Cons. Final'}</p>
                    </div>
                )}

                {/* Invoice Type */}
                {invoice && (
                    <div className="text-center border-[1px] border-black p-1 my-2 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 border border-black font-bold text-lg">
                            {invoice.tipo === 'factura_a' ? 'A' : invoice.tipo === 'factura_b' ? 'B' : 'C'}
                        </div>
                        <h2 className="text-md font-bold mt-2">
                            {invoice.tipo === 'factura_a' ? 'FACTURA' :
                                invoice.tipo === 'factura_b' ? 'FACTURA' :
                                    'TICKET'}
                        </h2>
                        <p className="text-[10px]">
                            Cod. {invoice.tipo === 'factura_a' ? '01' : invoice.tipo === 'factura_b' ? '06' : '11'}
                        </p>
                        <p className="text-xs font-bold">
                            {businessData.puntoVenta.toString().padStart(4, '0')} - {invoice.numero.toString().padStart(8, '0')}
                        </p>
                    </div>
                )}

                {/* Date and Time */}
                <div className="text-xs mb-2">
                    <p>Fecha: {format(toDate(sale.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                </div>

                {/* Items */}
                <div className="border-t border-black pt-2 mb-2">
                    <table className="w-full text-[10px]">
                        <thead>
                            <tr className="border-b border-black">
                                <th className="text-left">Producto</th>
                                <th className="text-right">Cant.</th>
                                <th className="text-right">P. Unit</th>
                                <th className="text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sale.items.map((item, index) => {
                                const isA = invoice?.tipo === 'factura_a';
                                const unitPrice = isA ? item.producto.precio_venta / 1.21 : item.producto.precio_venta;
                                const subTotal = isA ? item.subtotal / 1.21 : item.subtotal;

                                return (
                                    <tr key={index} className="border-b border-dashed border-gray-400">
                                        <td className="py-1">{item.producto.nombre}</td>
                                        <td className="text-right">
                                            {item.producto.es_pesable
                                                ? `${((item.peso_gramos || 0) / 1000).toFixed(3)}kg`
                                                : `${item.cantidad} un.`}
                                        </td>
                                        <td className="text-right">
                                            ${unitPrice.toFixed(2)}
                                        </td>
                                        <td className="text-right">
                                            ${subTotal.toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="border-t-2 border-black pt-2 mb-2">
                    {invoice && invoice.tipo === 'factura_a' && (
                        <>
                            <div className="flex justify-between text-xs mb-1">
                                <span>Subtotal Neto:</span>
                                <span>${invoice.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs mb-1">
                                <span>IVA (21%):</span>
                                <span>${invoice.iva_21.toFixed(2)}</span>
                            </div>
                        </>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-black pt-1">
                        <span>TOTAL:</span>
                        <span>{formatCurrency(sale.total)}</span>
                    </div>
                </div>

                {/* Payment Method */}
                <div className="text-xs mb-2">
                    <p>
                        Forma de Pago:{' '}
                        {sale.metodo_pago === 'efectivo' ? 'Efectivo' :
                            sale.metodo_pago === 'tarjeta_debito' ? 'Tarjeta Débito' :
                                sale.metodo_pago === 'tarjeta_credito' ? 'Tarjeta Crédito' :
                                    sale.metodo_pago === 'transferencia' ? 'Transferencia' :
                                        'Cuenta Corriente'}
                    </p>
                </div>

                {/* CAE (if available) */}
                {invoice && invoice.cae && (
                    <div className="border-t border-black pt-2 mb-2 text-xs">
                        <p>CAE: {invoice.cae}</p>
                        <p>
                            Vto. CAE:{' '}
                            {invoice.vencimiento_cae &&
                                format(toDate(invoice.vencimiento_cae), 'dd/MM/yyyy')}
                        </p>
                    </div>
                )}

                {/* QR Code */}
                {qrDataUrl && (
                    <div className="flex justify-center my-2">
                        <img src={qrDataUrl} alt="QR Code" className="w-32 h-32" />
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-xs border-t border-black pt-2 mt-2">
                    <p>¡Gracias por su compra!</p>
                    <p className="mt-2">Comprobante válido como factura</p>
                    <p>según RG AFIP 1415/03</p>
                </div>
            </div>
        );
    }
);

ThermalReceipt.displayName = 'ThermalReceipt';
