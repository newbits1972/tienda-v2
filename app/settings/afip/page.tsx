'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, CheckCircle2, AlertCircle, Server } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';

export default function AfipConfigPage() {
    const { tenantId } = useTenant();
    const [loading, setLoading] = useState(false);
    const [certificateStatus, setCertificateStatus] = useState<any>(null);
    const [formData, setFormData] = useState({
        cuit: '',
        punto_venta: 1,
        production: false
    });
    const [certFile, setCertFile] = useState<string>('');
    const [keyFile, setKeyFile] = useState<string>('');

    useEffect(() => {
        if (tenantId) {
            checkCertificateStatus();
        }
    }, [tenantId]);

    const checkCertificateStatus = async () => {
        try {
            const response = await fetch(`/api/afip/upload-certificate?tenantId=${tenantId}`);
            const data = await response.json();
            setCertificateStatus(data);

            if (data.configured) {
                setFormData({
                    cuit: data.cuit,
                    punto_venta: data.punto_venta,
                    production: data.production
                });
            }
        } catch (error) {
            console.error('Error checking certificate:', error);
        }
    };

    const handleFileRead = (event: React.ChangeEvent<HTMLInputElement>, type: 'cert' | 'key') => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (type === 'cert') {
                setCertFile(content);
            } else {
                setKeyFile(content);
            }
        };
        reader.readAsText(file);
    };

    const handleUpload = async () => {
        if (!certFile || !keyFile) {
            toast.error('Debes seleccionar ambos archivos (.crt y .key)');
            return;
        }

        if (!formData.cuit) {
            toast.error('El CUIT es requerido');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/afip/upload-certificate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId,
                    cuit: formData.cuit,
                    certificado: certFile,
                    clave_privada: keyFile,
                    punto_venta: formData.punto_venta,
                    production: formData.production
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al subir certificado');
            }

            toast.success(data.message);
            checkCertificateStatus();

            // Clear file inputs
            setCertFile('');
            setKeyFile('');

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const [diagResult, setDiagResult] = useState<any>(null);

    const handleTestConnection = async () => {
        setLoading(true);
        setDiagResult(null);
        try {
            const response = await fetch(`/api/afip/test-connection?tenantId=${tenantId}`);
            const data = await response.json();
            setDiagResult(data);

            if (data.success) {
                toast.success('¡Conexión exitosa!', {
                    description: 'El servicio de AFIP está respondiendo correctamente.'
                });
            } else {
                console.error('AFIP Connection Diagnostic:', data);

                if (data.error === 'Mismatched Credentials') {
                    toast.error('❌ Error Crítico: Mismatch de archivos', {
                        description: data.message,
                        duration: 10000
                    });
                } else if (data.error === 'Environment Mismatch' || data.error === 'CUIT Mismatch') {
                    toast.error(`❌ Error: ${data.error}`, {
                        description: data.message,
                        duration: 10000
                    });
                } else {
                    toast.error(`Fallo de Autenticación (401)`, {
                        description: 'AFIP rechazó el certificado. Revisa la autorización del servicio WSFE.',
                        duration: 7000
                    });
                }
            }
        } catch (error: any) {
            toast.error('Error técnico al probar la conexión: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
                    <Server className="w-8 h-8" />
                    Configuración AFIP
                </h1>
                <p className="text-zinc-400 mt-1">Gestiona tu certificado digital para facturación electrónica</p>
            </div>

            {/* Status Card */}
            {certificateStatus && (
                <Card className="bg-card border-border">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {certificateStatus.configured ? (
                                    <>
                                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        <div>
                                            <p className="font-bold text-white">Certificado Configurado</p>
                                            <p className="text-sm text-zinc-400">CUIT: {certificateStatus.cuit}</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-6 h-6 text-yellow-500" />
                                        <div>
                                            <p className="font-bold text-white">Sin Certificado</p>
                                            <p className="text-sm text-zinc-400">Debes configurar tus credenciales AFIP</p>
                                        </div>
                                    </>
                                )}
                            </div>
                            {certificateStatus.configured && (
                                <div className="flex gap-2">
                                    <Badge variant={certificateStatus.production ? "destructive" : "secondary"}>
                                        {certificateStatus.production ? 'Producción' : 'Homologación'}
                                    </Badge>
                                    <Badge variant="outline">
                                        PV: {certificateStatus.punto_venta}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Upload Form */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-gold flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        {certificateStatus?.configured ? 'Actualizar Certificado' : 'Subir Certificado'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400">CUIT del Contribuyente</Label>
                            <Input
                                value={formData.cuit}
                                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                                placeholder="20-12345678-9"
                                className="bg-muted border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Punto de Venta</Label>
                            <Input
                                type="number"
                                value={formData.punto_venta}
                                onChange={(e) => setFormData({ ...formData, punto_venta: parseInt(e.target.value) })}
                                className="bg-muted border-border"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-zinc-400">Certificado (.crt)</Label>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".crt,.pem"
                                onChange={(e) => handleFileRead(e, 'cert')}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-lg hover:border-muted-foreground/20 transition-colors">
                                <FileText className="w-4 h-4 text-zinc-500" />
                                <span className="text-sm text-zinc-400">
                                    {certFile ? '✅ Archivo cargado' : 'Seleccionar archivo .crt'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-zinc-400">Clave Privada (.key)</Label>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".key,.pem"
                                onChange={(e) => handleFileRead(e, 'key')}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-lg hover:border-muted-foreground/20 transition-colors">
                                <FileText className="w-4 h-4 text-zinc-500" />
                                <span className="text-sm text-zinc-400">
                                    {keyFile ? '✅ Archivo cargado' : 'Seleccionar archivo .key'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                        <div>
                            <Label className="text-white font-bold">Modo Producción</Label>
                            <p className="text-xs text-zinc-500 mt-1">Usar AFIP real (requiere homologación previa)</p>
                        </div>
                        <Switch
                            checked={formData.production}
                            onCheckedChange={(checked) => setFormData({ ...formData, production: checked })}
                        />
                    </div>

                    <div className="flex gap-4">
                        <Button
                            onClick={handleUpload}
                            disabled={loading || !certFile || !keyFile}
                            className="flex-1 h-12 bg-gold text-black hover:bg-gold/90 font-bold"
                        >
                            {loading ? 'Subiendo...' : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    {certificateStatus?.configured ? 'Actualizar Certificado' : 'Guardar Certificado'}
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={loading}
                            className={`px-6 h-12 border-border text-muted-foreground hover:text-foreground ${!tenantId && 'hidden'}`}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Probar Conexión
                        </Button>
                    </div>

                    {/* Diagnostic Results */}
                    {diagResult && (
                        <div className="mt-6 p-4 bg-muted border border-border rounded-xl space-y-4 animate-in fade-in zoom-in-95">
                            <h4 className="text-sm font-bold text-gold flex items-center gap-2 border-b border-border pb-2">
                                <FileText className="w-4 h-4" />
                                Diagnóstico Técnico del Certificado
                            </h4>
                            <div className="grid grid-cols-2 gap-y-3 text-xs">
                                <div>
                                    <p className="text-zinc-500 uppercase tracking-tighter">Emitido por</p>
                                    <p className="text-white font-medium">{diagResult.certInfo?.issuerName || 'Desconocido'}</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 uppercase tracking-tighter">Entorno Detectado</p>
                                    <p className={`font-bold ${diagResult.certInfo?.detectedEnv === 'production' ? 'text-red-400' : 'text-green-400'}`}>
                                        {diagResult.certInfo?.detectedEnv?.toUpperCase() || 'DESCONOCIDO'}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-zinc-500 uppercase tracking-tighter text-[10px]">Asunto (Subject)</p>
                                    <p className="text-zinc-400 font-mono text-[10px] break-all">
                                        {JSON.stringify(diagResult.certInfo?.subject)}
                                    </p>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-border mt-1">
                                    <p className="text-zinc-500 uppercase tracking-tighter">Resultado del Test de AFIP</p>
                                    <div className={`mt-1 p-2 rounded ${diagResult.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {diagResult.success ? 'CONEXIÓN EXITOSA' : (diagResult.message || 'FALLO')}
                                    </div>
                                    {!diagResult.success && diagResult.code === 401 && (
                                        <p className="mt-2 text-zinc-400 text-[10px] leading-tight">
                                            💡 Si el CUIT y Entorno están bien, verifica en AFIP (Administrador de Relaciones) que el servicio <b>WSFE</b> esté delegado a este certificado.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-500/10 border-blue-500/20">
                <CardContent className="pt-6">
                    <h3 className="font-bold text-blue-400 mb-2">📋 Cómo obtener tus certificados</h3>
                    <ol className="text-sm text-zinc-300 space-y-1 list-decimal list-inside">
                        <li>Ingresa a <a href="https://www.afip.gob.ar" target="_blank" className="text-blue-400 underline">AFIP</a> con Clave Fiscal</li>
                        <li>Ve a "Administrador de Relaciones" → "Adhesión a Servicios"</li>
                        <li>Busca "WSFE - Facturación Electrónica"</li>
                        <li>Genera o descarga tu certificado (.crt) y clave privada (.key)</li>
                        <li>Sube ambos archivos aquí</li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    );
}
