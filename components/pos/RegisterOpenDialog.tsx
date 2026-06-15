'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, PlayCircle, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useTenant } from '@/hooks/useTenant';

interface RegisterOpenDialogProps {
    isOpen: boolean;
    onOpenSuccess: () => void;
}

export function RegisterOpenDialog({ isOpen, onOpenSuccess }: RegisterOpenDialogProps) {
    const { user } = useAuth();
    const { tenantId } = useTenant();
    const [initialAmount, setInitialAmount] = useState('');
    const [cashierName, setCashierName] = useState(user?.nombre || '');
    const [loading, setLoading] = useState(false);

    const handleOpenRegister = async () => {
        if (!initialAmount || parseFloat(initialAmount) < 0 || !cashierName) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'cash_registers'), {
                fecha_apertura: Timestamp.now(),
                tenantId: tenantId,
                usuario_id: user?.id || 'unknown',
                cajero_nombre: cashierName || user?.nombre || 'Desconocido',
                monto_inicial: parseFloat(initialAmount),

                // Initialize sales counters to 0
                ventas_efectivo: 0,
                ventas_tarjeta_debito: 0,
                ventas_tarjeta_credito: 0,
                ventas_transferencia: 0,
                ventas_cuenta_corriente: 0,
                total_ventas: 0,

                cerrada: false, // Mark as OPEN
                created_at: Timestamp.now()
            });

            onOpenSuccess();
        } catch (error) {
            console.error("Error opening register:", error);
            alert("Error al abrir la caja. Intente nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-[450px] bg-card border-border [&>button]:hidden">
                <DialogHeader className="items-center text-center space-y-4 pt-6">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                        <Lock className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-bold text-foreground">
                            Punto de Venta Bloqueado
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Para comenzar a operar, debes abrir un nuevo turno de caja.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-6 font-geist">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cashier" className="text-muted-foreground">Nombre del Cajero</Label>
                            <Input
                                id="cashier"
                                type="text"
                                placeholder="Nombre completo del cajero"
                                value={cashierName}
                                onChange={(e) => setCashierName(e.target.value)}
                                className="bg-muted border-border focus:border-primary/50 text-foreground"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount" className="text-center block text-primary">Fondo Inicial de Caja</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={initialAmount}
                                    onChange={(e) => setInitialAmount(e.target.value)}
                                    className="text-center text-2xl h-14 bg-muted border-border focus:border-primary/50 text-foreground"
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                                Ingresa el dinero físico disponible en el cajón para cambio.
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={handleOpenRegister}
                        disabled={loading || !initialAmount || !cashierName}
                        className="w-full h-12 text-lg font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        {loading ? 'Abriendo Caja...' : (
                            <span className="flex items-center gap-2">
                                <PlayCircle className="w-5 h-5" /> Abrir Turno
                            </span>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
