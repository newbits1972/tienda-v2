'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableStatus } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { LayoutGrid, Armchair, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingTablesDialogProps {
    tables: Table[];
    isOpen: boolean;
    onClose: () => void;
    onLoadTable: (table: Table) => void;
}

export function PendingTablesDialog({ tables, isOpen, onClose, onLoadTable }: PendingTablesDialogProps) {
    const pendingTables = tables.filter(t => t.estado !== 'libre');

    const getStatusColor = (status: TableStatus) => {
        switch (status) {
            case 'ocupada': return 'bg-primary/10 text-primary border-primary/20';
            case 'pendiente_cobro': return 'bg-primary/20 text-primary border-primary/40 font-bold';
            default: return 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20';
        }
    };

    const getStatusLabel = (status: TableStatus) => {
        switch (status) {
            case 'ocupada': return 'En consumo';
            case 'pendiente_cobro': return 'Pendiente de cobro';
            default: return status;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-card border-gold/20">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <LayoutGrid className="w-6 h-6 text-primary" />
                        Mesas del Salón
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Seleccioná una mesa para cargar su pedido al POS.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {pendingTables.length === 0 ? (
                        <div className="col-span-full text-center py-10">
                            <Armchair className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-muted-foreground">No hay mesas ocupadas actualmente.</p>
                        </div>
                    ) : (
                        pendingTables.map((table) => (
                            <div
                                key={table.id}
                                className={`p-4 rounded-xl border transition-all group cursor-pointer flex flex-col justify-between h-40 ${table.estado === 'pendiente_cobro'
                                    ? 'bg-primary/5 border-primary/30 hover:bg-primary/10'
                                    : 'bg-muted border-border hover:border-primary/30'
                                    }`}
                                onClick={() => onLoadTable(table)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-black text-2xl text-foreground">Mesa {table.numero}</span>
                                            {table.estado === 'pendiente_cobro' && (
                                                <Badge className="bg-primary text-primary-foreground border-none animate-pulse text-[10px]">
                                                    POR COBRAR
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                            {table.cliente_nombre || 'Cliente Mesa'}
                                        </p>
                                    </div>
                                    <div className={`p-2 rounded-lg border ${getStatusColor(table.estado)}`}>
                                        <Armchair className="w-5 h-5" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                            Abierta hace {table.hora_ocupacion ? formatDistanceToNow(table.hora_ocupacion.toDate(), { locale: es }) : '---'}
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        className={`w-full text-xs font-bold ${table.estado === 'pendiente_cobro'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-primary/80 hover:bg-primary text-primary-foreground'
                                            }`}
                                    >
                                        <ArrowRight className="w-3 h-3 mr-2" />
                                        Cargar a Caja
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <Button variant="primary" onClick={onClose} className="w-full">
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
