'use client';

import React, { useState } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Copy, ExternalLink, CheckCircle2, QrCode } from 'lucide-react';
import { toast } from 'sonner';

export default function CatalogSettingsPage() {
    const { tenantId, storeName } = useTenant();
    const [copied, setCopied] = useState(false);

    // Get the base URL from window if available, otherwise fallback
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const catalogUrl = `${baseUrl}/catalogo/${tenantId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(catalogUrl);
        setCopied(true);
        toast.success('Link copiado al portapapeles');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Globe className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Catálogo Online</h1>
                    <p className="text-muted-foreground text-sm">Gestioná tu presencia digital y compartí tus productos</p>
                </div>
            </div>

            <Card className="bg-card border-primary/20 shadow-lg shadow-primary/5">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        Tu Link Público
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Copiá este link y pegalo en tu biografía de Instagram, Facebook o WhatsApp para que tus clientes puedan pedirte.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            readOnly
                            value={catalogUrl}
                            className="font-mono text-sm h-11 bg-muted border-border focus:ring-primary"
                        />
                        <Button
                            variant="primary"
                            className="shrink-0 h-11 px-6 shadow-md shadow-primary/20"
                            onClick={handleCopy}
                        >
                            {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                            {copied ? 'Copiado' : 'Copiar'}
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <Button
                            variant="outline"
                            className="border-border text-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                            onClick={() => window.open(catalogUrl, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Previsualizar Catálogo
                        </Button>
                        <Button
                            variant="outline"
                            className="border-border text-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                            <QrCode className="h-4 w-4 mr-2" />
                            Generar QR (Próximamente)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-card border-border shadow-md">
                    <CardHeader>
                        <CardTitle className="text-sm uppercase tracking-wider text-primary font-bold">¿Cómo funciona?</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-foreground space-y-3 font-medium">
                        <p className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">1</span>
                            Tus clientes entran al link sin necesidad de apps ni registros.
                        </p>
                        <p className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">2</span>
                            Seleccionan los productos (fiambres por peso o unidad).
                        </p>
                        <p className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">3</span>
                            El pedido te llega directamente por WhatsApp con el detalle y total.
                        </p>
                        <p className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">4</span>
                            También podés ver los pedidos en tu panel de "Ventas Online".
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-md">
                    <CardHeader>
                        <CardTitle className="text-sm uppercase tracking-wider text-primary font-bold">Tips de Venta</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-foreground space-y-3 font-medium">
                        <p className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">💡</span>
                            Agregá fotos de alta calidad a tus productos para tentar a los clientes.
                        </p>
                        <p className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">⚙️</span>
                            Mantené el stock actualizado para evitar cancelaciones.
                        </p>
                        <p className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">📱</span>
                            Compartí el link en tus estados de WhatsApp cada mañana.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
