'use client';

import React, { useState, useEffect } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, QrCode, CreditCard, Smartphone } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useTenant } from '@/hooks/useTenant';

// Initialize SDK (Public Key should be in env)
const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '';
if (publicKey) {
    console.log('MP SDK Initialized with key:', publicKey.substring(0, 10) + '...');
    initMercadoPago(publicKey, { locale: 'es-AR' });
} else {
    console.error('CRITICAL: NEXT_PUBLIC_MP_PUBLIC_KEY is not defined!');
}

interface MPPaymentFlowProps {
    total: number;
    items: any[];
    onSuccess: (paymentId: string) => void;
    onCancel: () => void;
}

export function MPPaymentFlow({ total, items, onSuccess, onCancel }: MPPaymentFlowProps) {
    const { tenantId } = useTenant();
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'selection' | 'brick' | 'qr' | 'point'>('selection');
    const [devices, setDevices] = useState<any[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [pointStatus, setPointStatus] = useState<'pending' | 'processing' | 'approved' | 'rejected'>('pending');

    // Fetch devices when entering Point view
    useEffect(() => {
        if (view === 'point') {
            fetchDevices();
        }
    }, [view]);

    const fetchDevices = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/mercadopago/point/devices?tenantId=${tenantId}`);
            const data = await response.json();
            if (data.devices) {
                setDevices(data.devices);
                if (data.devices.length > 0) {
                    setSelectedDevice(data.devices[0].id);
                }
            }
        } catch (err) {
            console.error('Error fetching devices:', err);
            setError('Error al cargar terminales Point.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePointIntent = async () => {
        if (!selectedDevice) return;
        setLoading(true);
        setError(null);
        setPointStatus('processing');
        try {
            const externalReference = `sale_${Date.now()}`;

            console.log('[Point] Enviando intent:', {
                deviceId: selectedDevice,
                amount: total,
                externalReference,
                tenantId
            });

            const response = await fetch('/api/mercadopago/point/intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: selectedDevice,
                    amount: total,
                    externalReference,
                    tenantId
                })
            });

            const data = await response.json();

            console.log('[Point] Respuesta completa:', {
                status: response.status,
                ok: response.ok,
                data
            });

            if (!response.ok) {
                console.error('[Point] ❌ Error del servidor:', data);

                // Mensaje específico para intent pendiente
                if (data.details?.includes('already a queued intent')) {
                    throw new Error('⏳ Hay un cobro pendiente en el Point. Por favor complétalo o cancélalo primero.');
                }

                throw new Error(data.details || data.error || `Error ${response.status}`);
            }

            if (data.id) {
                // In a real scenario, we would poll the status or wait for Webhook
                // For this MVP, we will show "Waiting for device..."
                startPolling(data.id);
            } else {
                throw new Error(data.error || 'Error al enviar a la terminal');
            }
        } catch (err: any) {
            console.error('[Point] ❌ Error capturado:', err);
            setError(err.message);

            // Si el error indica que está ocupado o no permitido, sugerir liberar
            if (err.message.includes('queued intent') || err.message.includes('not allowed')) {
                setError(err.message + ' (Sugerencia: Dale a "Liberar Terminal")');
            }

            setPointStatus('pending');
        } finally {
            setLoading(false);
        }
    };

    const handleChangeMode = async (deviceId: string, mode: 'PDV' | 'STANDALONE') => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/mercadopago/point/mode', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId, mode, tenantId })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.details || data.error || 'Error al cambiar el modo');

            // Refresh devices to reflect the change
            await fetchDevices();
        } catch (err: any) {
            console.error('Error changing mode:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelIntent = async () => {
        if (!selectedDevice) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/mercadopago/point/intent/cancel?deviceId=${selectedDevice}&tenantId=${tenantId}`, {
                method: 'DELETE'
            });

            let data: any = {};
            const text = await response.text();
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error('Error parsing JSON from cancel:', text);
                }
            }

            if (!response.ok) throw new Error(data.details || data.error || 'Error al cancelar');

            setPointStatus('pending');
            setError('✅ Terminal liberada. Intentá nuevamente.');

            // Refresh devices
            await fetchDevices();
        } catch (err: any) {
            console.error('Error cancelling intent:', err);
            setError('Error al liberar terminal: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const startPolling = async (intentId: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/mercadopago/point/status/${intentId}?tenantId=${tenantId}`);
                if (!res.ok) return;

                const data = await res.json();

                // Point Intent status can be: OPEN, CANCELED, FINISHED, EXPIRED
                if (data.status === 'FINISHED') {
                    clearInterval(interval);
                    setPointStatus('approved');
                    onSuccess(intentId);
                } else if (data.status === 'CANCELED' || data.status === 'EXPIRED') {
                    clearInterval(interval);
                    setPointStatus('rejected');
                    setError(`La terminal informó que el cobro fue ${data.status === 'CANCELED' ? 'cancelado' : 'expirado'}.`);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);

        return () => clearInterval(interval);
    };

    const handleCreatePreference = async () => {
        setLoading(true);
        setError(null);
        try {
            const externalReference = `sale_${Date.now()}`;
            const response = await fetch('/api/mercadopago/preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, externalReference, tenantId })
            });

            const data = await response.json();
            if (data.id) {
                setPreferenceId(data.id);
                setView('brick');
            } else {
                throw new Error(data.error || 'Error al generar preferencia');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const initialization = {
        amount: total,
        preferenceId: preferenceId || undefined,
    };

    const customization: any = {
        paymentMethods: {
            creditCard: 'all',
            debitCard: 'all',
            mercadoPago: 'all',
        },
        visual: {
            style: {
                theme: 'dark'
            }
        }
    };

    const onSubmit = async ({ selectedPaymentMethod, formData }: any) => {
        setLoading(true);
        setError(null);
        console.log('Brick Form Data:', formData);
        console.log('Sending Token:', formData.token);

        try {
            // Include our external reference so we can link the payment to the sale later
            const payload = {
                ...formData,
                external_reference: `sale_${Date.now()}`
            };

            const response = await fetch('/api/mercadopago/process_payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.status === 'approved') {
                onSuccess(data.id.toString());
            } else if (data.status) {
                // Payment was processed but not approved (rejected, pending, etc.)
                setError(`Pago ${data.status}: ${data.status_detail || 'Rechazado'}`);
            } else {
                // Log the whole data for technical support
                console.error('Detailed Server Error:', data);
                setError(data.message || data.error || 'Error al procesar pago');
            }
        } catch (err: any) {
            console.error('Submission error:', err);
            setError(err.message || 'Error al procesar el pago');
        } finally {
            setLoading(false);
        }
    };

    const onError = async (error: any) => {
        console.error('Brick Error:', error);
        setError('Error en el módulo de pago');
    };

    const onReady = async () => {
        setLoading(false);
    };

    return (
        <div className="space-y-4 p-4 bg-muted/50 border border-border rounded-lg animate-in fade-in zoom-in-95">
            {view === 'selection' && (
                <div className="space-y-4 text-center">
                    <h3 className="text-lg font-semibold text-primary">Seleccionar medio de pago MP</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="primary"
                            className="h-28 flex flex-col gap-2 shadow-lg shadow-primary/20"
                            onClick={() => setView('point')}
                        >
                            <CreditCard className="w-8 h-8" />
                            <div className="flex flex-col">
                                <span className="font-bold">Terminal Point</span>
                                <span className="text-[10px] opacity-80">Cobro físico con lectora</span>
                            </div>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-28 flex flex-col gap-2 border-primary/10 hover:border-primary/40"
                            onClick={() => setView('qr')}
                        >
                            <QrCode className="w-8 h-8 text-primary" />
                            <div className="flex flex-col">
                                <span className="font-bold">QR Dinámico</span>
                                <span className="text-[10px] opacity-80">Escaneo desde el celular</span>
                            </div>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-primary/10 hover:border-primary/40 opacity-60"
                            onClick={handleCreatePreference}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Smartphone className="w-6 h-6 text-primary" />}
                            <span className="text-xs">Tarjeta Integrada (Web)</span>
                        </Button>
                        <Button variant="ghost" onClick={onCancel} className="h-24 text-muted-foreground hover:text-foreground">
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {view === 'point' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gold">Cobro con Mercado Point</h3>
                        <Button variant="ghost" size="sm" onClick={() => setView('selection')}>Volver</Button>
                    </div>

                    {devices.length === 0 && !loading ? (
                        <div className="text-center py-4 bg-muted/50 rounded-lg border border-dashed border-border">
                            <p className="text-sm text-muted-foreground">No se encontraron terminales vinculadas.</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">Asegurate de tener tu lectora Point vinculada a tu cuenta de MP.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-muted-foreground">Seleccionar Terminal</label>
                                <select
                                    value={selectedDevice}
                                    onChange={(e) => setSelectedDevice(e.target.value)}
                                    className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground"
                                >
                                    {devices.map(device => (
                                        <option key={device.id} value={device.id}>
                                            {device.operating_mode === 'PDV' ? '✅ Point Smart (Modo PDV)' : '⚠️ Point Device (Modo Standalone)'} - {device.id}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedDevice && devices.find(d => d.id === selectedDevice)?.operating_mode !== 'PDV' && (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md space-y-2">
                                    <p className="text-xs text-blue-400">
                                        Este dispositivo está en modo <b>Standalone</b>. Para recibir cobros desde esta app, debe estar en modo <b>PDV</b>.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs h-8"
                                        onClick={() => handleChangeMode(selectedDevice, 'PDV')}
                                        disabled={loading}
                                    >
                                        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                                        Cambiar a modo PDV ahora
                                    </Button>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-xs h-9 border-border text-muted-foreground hover:text-foreground"
                                    onClick={handleCancelIntent}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <XCircle className="w-3 h-3 mr-2" />}
                                    Liberar Terminal
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-xs h-9 border-border text-muted-foreground hover:text-foreground"
                                    onClick={fetchDevices}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Smartphone className="w-3 h-3 mr-2" />}
                                    Actualizar
                                </Button>
                            </div>

                            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">Monto a enviar:</p>
                                <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
                            </div>

                            {pointStatus === 'processing' ? (
                                <div className="text-center py-6 space-y-4 animate-pulse">
                                    <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                                    <div className="space-y-1">
                                        <p className="font-bold text-foreground">Esperando confirmación...</p>
                                        <p className="text-xs text-muted-foreground">Completá el cobro en la terminal Point</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setPointStatus('pending')} className="mt-4">
                                        Cancelar Espera
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="primary"
                                    className="w-full h-12 text-lg font-bold"
                                    onClick={handleCreatePointIntent}
                                    disabled={loading || !selectedDevice}
                                >
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                                    Enviar a Terminal
                                </Button>
                            )}

                            {/* Simulator for development/sandbox without real device */}
                            {pointStatus === 'processing' && process.env.NODE_ENV === 'development' && (
                                <Button
                                    variant="ghost"
                                    className="w-full text-[10px] text-muted-foreground hover:text-gold"
                                    onClick={() => onSuccess('mock_point_123')}
                                >
                                    (Simular Pago Aprobado en Point)
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {view === 'qr' && (
                <div className="text-center py-8 space-y-4">
                    <QrCode className="w-32 h-32 mx-auto text-gold animate-pulse" />
                    <div className="space-y-1">
                        <p className="font-medium text-foreground text-xl">Escanea para pagar</p>
                        <p className="text-sm text-muted-foreground">Total: {formatCurrency(total)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground/60 italic">
                        Esta es una simulación del QR dinámico. El monto se cargará automáticamente en el celular del cliente.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setView('selection')}>
                            Volver
                        </Button>
                        <Button variant="primary" className="flex-1" onClick={() => onSuccess('sim_123')}>
                            Simular Pago Aprobado
                        </Button>
                    </div>
                </div>
            )}

            {view === 'brick' && preferenceId && (
                <div className="min-h-[600px] sm:min-h-[500px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-primary">Pago con Tarjeta Web</h3>
                        <Button variant="ghost" size="sm" onClick={() => setView('selection')}>
                            Volver
                        </Button>
                    </div>

                    <Payment
                        initialization={{ amount: total, preferenceId }}
                        customization={{
                            paymentMethods: {
                                creditCard: 'all',
                                debitCard: 'all',
                                mercadoPago: 'all',
                            },
                            visual: { style: { theme: 'dark' } }
                        }}
                        onSubmit={async ({ formData }: any) => {
                            setLoading(true);
                            setError(null);
                            try {
                                const response = await fetch('/api/mercadopago/process_payment', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        ...formData,
                                        external_reference: `sale_${Date.now()}`,
                                        tenantId
                                    })
                                });
                                const data = await response.json();
                                if (data.status === 'approved') onSuccess(data.id.toString());
                                else setError(`Pago ${data.status}: ${data.status_detail || 'Rechazado'}`);
                            } catch (err: any) {
                                setError(err.message);
                            } finally {
                                setLoading(false);
                            }
                        }}
                        onError={(err: any) => setError('Error en el módulo de pago')}
                        onReady={() => setLoading(false)}
                    />
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded flex items-center gap-2 text-red-500">
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs">{error}</span>
                </div>
            )}
        </div>
    );
}
