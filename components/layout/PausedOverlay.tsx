'use client';

import React from 'react';
import { ShieldAlert, LogOut, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function PausedOverlay() {
    const { logout, user } = useAuth();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
            <div className="max-w-md w-full bg-card border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl shadow-red-500/10 animate-in fade-in zoom-in duration-500">
                <div className="mb-6 flex justify-center">
                    <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
                        <ShieldAlert className="w-12 h-12 text-red-500" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-2">Acceso Suspendido</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                    La suscripción de <span className="text-gold font-bold">{user?.tenantId}</span> se encuentra pausada temporalmente.
                    Por favor, contacta con el administrador del sistema para regularizar la situación.
                </p>

                <div className="space-y-3">
                    <Button
                        asChild
                        className="w-full bg-primary text-primary-foreground hover:opacity-90 font-bold h-12"
                    >
                        <a href="https://wa.me/your-whatsapp-number" target="_blank" rel="noreferrer">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Contactar Soporte
                        </a>
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={() => logout()}
                        className="w-full text-muted-foreground hover:text-foreground"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Cerrar Sesión
                    </Button>
                </div>

                <p className="mt-8 text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">
                    DataSense Pro Management System
                </p>
            </div>
        </div>
    );
}
