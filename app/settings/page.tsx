'use client';

import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Download,
    Upload,
    AlertTriangle,
    Store,
    CreditCard,
    Palette,
    Image as ImageIcon,
    CheckCircle2,
    Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { exportData, importData } from '@/lib/backupUtils';
import { toast } from 'sonner';
import { UserManagement } from '@/components/settings/UserManagement';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTenant } from '@/hooks/useTenant';
import { doc, getDoc, setDoc, Timestamp, getDocs, query, collection, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product } from '@/lib/types';

const DEFAULT_BUSINESS_DATA = {
    nombre: 'DataSense Retail',
    cuit: '20-30456789-5',
    direccion: 'Av. Corrientes 1234, CABA',
    telefono: '011 4455-6677',
    whatsapp: '5491144556677',
    alias: '',
    cbu: '',
    puntoVenta: 1
};

export default function SettingsPage() {
    const isOnline = useOnlineStatus();
    const { tenantId } = useTenant();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Business Data State
    const [businessData, setBusinessData] = useState(DEFAULT_BUSINESS_DATA);
    const [isSavingBusiness, setIsSavingBusiness] = useState(false);
    const [hasSuperAdmin, setHasSuperAdmin] = useState(true); // Default to true to hide during check

    // Mercado Pago State
    const [mpConfig, setMpConfig] = useState({
        accessToken: '',
        publicKey: ''
    });

    const [branding, setBranding] = useState({
        primaryColor: '#FFBC0D',
        logoUrl: '',
        themeId: 'clean-enterprise' as 'clean-enterprise' | 'fresh-retail' | 'modern-slate',
        quickAccessIds: [] as string[]
    });

    const [products, setProducts] = useState<Product[]>([]);

    // Initial load from Firestore
    useEffect(() => {
        if (!tenantId) return;

        const loadSettings = async () => {
            try {
                // Check if any superadmin exists
                const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
                const adminQuery = query(collection(db, 'users'), where('rol', '==', 'superadmin'), limit(1));
                const adminSnap = await getDocs(adminQuery);
                setHasSuperAdmin(!adminSnap.empty);

                const configRef = doc(db, 'store_configs', tenantId);
                const snap = await getDoc(configRef);

                if (snap.exists()) {
                    const data = snap.data();
                    setBusinessData({
                        nombre: data.nombre || DEFAULT_BUSINESS_DATA.nombre,
                        cuit: data.afip?.cuit || DEFAULT_BUSINESS_DATA.cuit,
                        direccion: data.direccion || DEFAULT_BUSINESS_DATA.direccion,
                        telefono: data.telefono || DEFAULT_BUSINESS_DATA.telefono,
                        whatsapp: data.whatsapp || DEFAULT_BUSINESS_DATA.whatsapp,
                        alias: data.alias || '',
                        cbu: data.cbu || '',
                        puntoVenta: data.afip?.punto_venta || DEFAULT_BUSINESS_DATA.puntoVenta,
                    });
                    setMpConfig({
                        accessToken: data.mercadoPago?.accessToken || '',
                        publicKey: data.mercadoPago?.publicKey || ''
                    });
                    setBranding({
                        primaryColor: data.branding?.primaryColor || '#FFBC0D',
                        logoUrl: data.branding?.logoUrl || '',
                        themeId: data.branding?.themeId || 'clean-enterprise',
                        quickAccessIds: data.branding?.quickAccessIds || []
                    });
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };
        loadSettings();

        // Load all products for the selector
        const loadProducts = async () => {
            const q = query(collection(db, 'products'), where('tenantId', '==', tenantId), where('activo', '==', true));
            const snap = await getDocs(q);
            setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        };
        loadProducts();
    }, [tenantId]);

    const handleSaveBusinessData = async () => {
        if (!tenantId) return;
        setIsSavingBusiness(true);
        try {
            const configRef = doc(db, 'store_configs', tenantId);
            await setDoc(configRef, {
                nombre: businessData.nombre,
                direccion: businessData.direccion,
                telefono: businessData.telefono,
                whatsapp: businessData.whatsapp,
                alias: businessData.alias,
                cbu: businessData.cbu,
                afip: {
                    cuit: businessData.cuit,
                    punto_venta: businessData.puntoVenta,
                },
                updated_at: Timestamp.now()
            }, { merge: true });

            toast.success('Datos comerciales actualizados');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Error al guardar configuración');
        } finally {
            setIsSavingBusiness(false);
        }
    };

    const handleSaveMPConfig = async () => {
        if (!tenantId) return;
        setIsSavingBusiness(true);
        try {
            const configRef = doc(db, 'store_configs', tenantId);
            await setDoc(configRef, {
                mercadoPago: {
                    accessToken: mpConfig.accessToken,
                    publicKey: mpConfig.publicKey,
                },
                updated_at: Timestamp.now()
            }, { merge: true });

            toast.success('Configuración de Mercado Pago guardada');
        } catch (error) {
            console.error('Error saving MP settings:', error);
            toast.error('Error al guardar credenciales de pago');
        } finally {
            setIsSavingBusiness(false);
        }
    };

    const handleSaveBranding = async () => {
        if (!tenantId) return;
        setIsSavingBusiness(true);
        try {
            const configRef = doc(db, 'store_configs', tenantId);
            await setDoc(configRef, {
                branding: {
                    primaryColor: branding.primaryColor,
                    logoUrl: branding.logoUrl,
                    themeId: branding.themeId,
                    quickAccessIds: branding.quickAccessIds,
                },
                updated_at: Timestamp.now()
            }, { merge: true });

            toast.success('Branding actualizado');
            document.documentElement.style.setProperty('--tenant-primary', branding.primaryColor);
        } catch (error) {
            console.error('Error saving branding:', error);
            toast.error('Error al guardar branding');
        } finally {
            setIsSavingBusiness(false);
        }
    };

    const handleExport = async () => {
        if (!tenantId) return;
        setIsExporting(true);
        try {
            await exportData(tenantId);
            toast.success('Copia de seguridad creada exitosamente');
        } catch (error) {
            toast.error('Error al crear la copia de seguridad');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('ADVERTENCIA: Esta acción combinará/sobrescribirá los datos actuales con los del archivo de respaldo. ¿Estás seguro de continuar?')) {
            e.target.value = '';
            return;
        }

        setIsImporting(true);
        try {
            await importData(file, tenantId!);
            toast.success('Restauración completada', {
                description: 'Los datos han sido importados exitosamente.',
            });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            toast.error('Error en la restauración', {
                description: 'El archivo podría estar corrupto o tener un formato inválido.',
            });
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };

    const handleMakeAdmin = async () => {
        if (!confirm('Esto te otorgará permisos de SUPER-ADMINISTRADOR GLOBAL. ¿Continuar?')) return;
        try {
            const { auth } = await import('@/lib/firebase/config');

            if (auth.currentUser) {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await setDoc(userRef, {
                    rol: 'superadmin',
                    email: auth.currentUser.email,
                    nombre: auth.currentUser.displayName || 'Super Admin',
                    activo: true,
                    tenantId: tenantId || 'default_store' // Super admins still need a primary tenant
                }, { merge: true });
                toast.success('¡Permisos de Super-Admin otorgados!');
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (e) {
            console.error(e);
            toast.error('Error al actualizar permisos');
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="space-y-1 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8" />
                        Configuración y Seguridad
                        {tenantId && <Badge variant="outline" className="ml-2 border-primary/40 text-primary font-mono">{tenantId}</Badge>}
                    </h1>
                    <p className="text-muted-foreground">
                        Administra los datos del negocio, copias de seguridad y preferencias del sistema.
                    </p>
                </div>
                {/* Temporary Dev Button - Only shows if no superadmin exists */}
                {!hasSuperAdmin && (
                    <Button variant="destructive" size="sm" onClick={handleMakeAdmin} className="animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                        👑 Crear Primer Super-Admin
                    </Button>
                )}
            </div>

            <Tabs defaultValue="fiscal" className="space-y-6">
                <TabsList className="bg-muted border border-border">
                    <TabsTrigger value="fiscal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Datos del Negocio
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Pasarela de Pagos
                    </TabsTrigger>
                    <TabsTrigger value="backup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Seguridad y Backup
                    </TabsTrigger>
                    <TabsTrigger value="branding" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Apariencia (Branding)
                    </TabsTrigger>
                    <TabsTrigger value="afip" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Facturación AFIP
                    </TabsTrigger>
                    <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Usuarios
                    </TabsTrigger>
                </TabsList>

                {/* BUSINESS DATA TAB */}
                <TabsContent value="fiscal">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-card border-border md:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Store className="w-5 h-5 text-primary" />
                                    Información Comercial
                                </CardTitle>
                                <CardDescription>
                                    Estos datos aparecerán en los tickets y facturas emitidos.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nombre">Razón Social / Nombre de Fantasía</Label>
                                    <Input
                                        id="nombre"
                                        value={businessData.nombre}
                                        onChange={(e) => setBusinessData({ ...businessData, nombre: e.target.value })}
                                        className="bg-muted border-border"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cuit">CUIT (Sin guiones opcional)</Label>
                                    <Input
                                        id="cuit"
                                        value={businessData.cuit}
                                        onChange={(e) => setBusinessData({ ...businessData, cuit: e.target.value })}
                                        className="bg-muted border-border"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="direccion">Dirección Comercial</Label>
                                    <Input
                                        id="direccion"
                                        value={businessData.direccion}
                                        onChange={(e) => setBusinessData({ ...businessData, direccion: e.target.value })}
                                        className="bg-muted border-border"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telefono">Teléfono Local</Label>
                                    <Input
                                        id="telefono"
                                        value={businessData.telefono}
                                        onChange={(e) => setBusinessData({ ...businessData, telefono: e.target.value })}
                                        className="bg-muted border-border"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="whatsapp" className="text-gold flex items-center gap-2">
                                        WhatsApp Pedidos Online
                                        <Badge variant="outline" className="text-[10px] border-gold/20 text-gold font-normal">Público</Badge>
                                    </Label>
                                    <Input
                                        id="whatsapp"
                                        placeholder="Ej: 5491144556677"
                                        value={businessData.whatsapp}
                                        onChange={(e) => setBusinessData({ ...businessData, whatsapp: e.target.value })}
                                        className="bg-muted border-gold/20 focus:ring-gold"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Incluir código de país (549 para Argentina).</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="alias" className="text-primary">Alias CBU/CVU</Label>
                                        <Input
                                            id="alias"
                                            placeholder="mi.negocio.mp"
                                            value={businessData.alias}
                                            onChange={(e) => setBusinessData({ ...businessData, alias: e.target.value })}
                                            className="bg-muted border-primary/20 focus:ring-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cbu" className="text-primary">CBU/CVU (22 dígitos)</Label>
                                        <Input
                                            id="cbu"
                                            placeholder="0000000000000000000000"
                                            value={businessData.cbu}
                                            onChange={(e) => setBusinessData({ ...businessData, cbu: e.target.value })}
                                            className="bg-muted border-primary/20 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pv">Punto de Venta</Label>
                                    <Input
                                        id="pv"
                                        type="number"
                                        value={businessData.puntoVenta}
                                        onChange={(e) => setBusinessData({ ...businessData, puntoVenta: parseInt(e.target.value) || 1 })}
                                        className="bg-muted border-border"
                                    />
                                </div>
                                <Button
                                    className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={handleSaveBusinessData}
                                    disabled={isSavingBusiness}
                                >
                                    {isSavingBusiness ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* PAYMENTS TAB */}
                <TabsContent value="payments">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <CreditCard className="w-5 h-5 text-primary" />
                                    Mercado Pago
                                </CardTitle>
                                <CardDescription>
                                    Configura tus credenciales para recibir pagos por Point, QR y Web.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mp-access-token">Access Token (Producción)</Label>
                                    <Input
                                        id="mp-access-token"
                                        type="password"
                                        value={mpConfig.accessToken}
                                        onChange={(e) => setMpConfig({ ...mpConfig, accessToken: e.target.value })}
                                        className="bg-muted border-border"
                                        placeholder="APP_USR-..."
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Buscalo en tu cuenta de Mercado Pago {'>'} Tus Aplicaciones.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mp-public-key">Public Key</Label>
                                    <Input
                                        id="mp-public-key"
                                        value={mpConfig.publicKey}
                                        onChange={(e) => setMpConfig({ ...mpConfig, publicKey: e.target.value })}
                                        className="bg-muted border-border"
                                        placeholder="APP_USR-..."
                                    />
                                </div>
                                <Button
                                    className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={handleSaveMPConfig}
                                    disabled={isSavingBusiness}
                                >
                                    {isSavingBusiness ? 'Guardando...' : 'Guardar Credenciales MP'}
                                </Button>
                                <Alert className="bg-blue-500/10 border-blue-500/50 mt-4">
                                    <AlertTriangle className="h-4 w-4 text-blue-400" />
                                    <AlertTitle className="text-blue-400">Nota sobre Webhooks</AlertTitle>
                                    <AlertDescription className="text-blue-400/90 text-[10px] mt-1">
                                        No te olvides de configurar la URL de notificaciones en tu panel de Mercado Pago para este tenant:
                                        <br />
                                        <code className="text-[9px] break-all">
                                            {(typeof window !== 'undefined' ? window.location.origin : '')}/api/mercadopago/webhook?tenantId={tenantId}
                                        </code>
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* BACKUP TAB */}
                <TabsContent value="backup">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Download className="w-5 h-5 text-primary" />
                                    Exportar Datos
                                </CardTitle>
                                <CardDescription>
                                    Descarga una copia completa de tu base de datos (productos, ventas, clientes).
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    className="w-full" variant="outline"
                                    onClick={handleExport}
                                    disabled={isExporting}
                                >
                                    {isExporting ? 'Exportando...' : 'Descargar Backup (.json)'}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Upload className="w-5 h-5 text-primary" />
                                    Restaurar Datos
                                </CardTitle>
                                <CardDescription>
                                    Restaura tu base de datos desde un archivo backup previo.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="picture">Archivo de Backup</Label>
                                    <Input
                                        id="picture"
                                        type="file"
                                        accept=".json"
                                        onChange={handleImport}
                                        disabled={isImporting}
                                        className="bg-muted border-border cursor-pointer file:text-foreground file:bg-muted file:border-0 file:rounded-md file:mr-4 file:px-2 file:text-sm"
                                    />
                                </div>
                                <Alert className="bg-yellow-500/10 border-yellow-500/50">
                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    <AlertTitle className="text-yellow-500">Advertencia</AlertTitle>
                                    <AlertDescription className="text-yellow-500/90 text-xs mt-1">
                                        Importar datos sobrescribirá información existente. Asegúrate de tener un backup reciente.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border md:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <ShieldCheck className="w-5 h-5 text-gold" />
                                    Estado del Sistema
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                                        <span className="font-medium text-foreground">
                                            {isOnline ? 'Sistema Online - Conectado a Servidores' : 'Sin Conexión - Modo Offline Activado'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        v1.0.0
                                    </span>
                                </div>

                                <Alert className="bg-muted border-border">
                                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                    <AlertTitle className="text-foreground">Recomendación</AlertTitle>
                                    <AlertDescription className="text-muted-foreground text-xs mt-1">
                                        Se recomienda realizar una copia de seguridad manual al finalizar cada cierre de caja mensual.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* BRANDING TAB */}
                <TabsContent value="branding">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Palette className="w-5 h-5 text-primary" />
                                    Identidad Visual
                                </CardTitle>
                                <CardDescription>
                                    Personaliza los colores y el logo de tu sistema y tienda online.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <Label>Color Primario del Sistema</Label>
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-lg border border-zinc-700 shadow-lg"
                                            style={{ backgroundColor: branding.primaryColor }}
                                        />
                                        <Input
                                            type="color"
                                            value={branding.primaryColor}
                                            onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                            className="w-24 h-10 p-1 bg-muted border-border cursor-pointer"
                                        />
                                        <Input
                                            value={branding.primaryColor}
                                            onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                            className="flex-1 bg-muted border-border font-mono"
                                            placeholder="#FFBC0D"
                                        />
                                    </div>
                                    <p className="text-[10px] text-zinc-500">
                                        Este color se usará en botones, íconos y elementos destacados de todo el sistema.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <Label className="flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" />
                                        URL del Logo Personalizado
                                    </Label>
                                    <Input
                                        value={branding.logoUrl}
                                        onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                                        className="bg-muted border-border"
                                        placeholder="https://tu-sitio.com/logo.png"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Si se deja vacío, se usará el logo por defecto de PedidosIA.
                                    </p>

                                    {branding.logoUrl && (
                                        <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border flex justify-center">
                                            <img
                                                src={branding.logoUrl}
                                                alt="Previsualización Logo"
                                                className="h-16 w-auto object-contain"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border">
                                    <Label className="flex items-center gap-2">
                                        <Palette className="w-4 h-4" />
                                        Tema Visual (Retail)
                                    </Label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { id: 'clean-enterprise', name: 'Clean Enterprise', desc: 'Blanco & Indigo - Profesional SaaS', color: '#2563eb' },
                                            { id: 'fresh-retail', name: 'Fresh Retail', desc: 'Blanco Hueso & Esmeralda - Frescura', color: '#047857' },
                                            { id: 'modern-slate', name: 'Modern Slate', desc: 'Gris Slate & Naranja - Eficiencia', color: '#f97316' },
                                        ].map((theme) => (
                                            <div
                                                key={theme.id}
                                                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${branding.themeId === theme.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border bg-muted hover:border-muted-foreground/20'
                                                    }`}
                                                onClick={() => setBranding({ ...branding, themeId: theme.id as any, primaryColor: theme.color })}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.color }} />
                                                    <div>
                                                        <p className="text-sm font-bold text-foreground">{theme.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{theme.desc}</p>
                                                    </div>
                                                </div>
                                                {branding.themeId === theme.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border">
                                    <Label className="flex items-center gap-2">
                                        <Utensils className="w-4 h-4" />
                                        Accesos Rápidos del TPV (Máx. 10)
                                    </Label>
                                    <Card className="bg-card border-border">
                                        <CardContent className="p-3">
                                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                                                {products.map((product) => (
                                                    <div
                                                        key={product.id}
                                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${branding.quickAccessIds.includes(product.id)
                                                            ? 'bg-gold/10 border-gold/50'
                                                            : 'bg-card border-transparent hover:border-border'
                                                            }`}
                                                        onClick={() => {
                                                            const isSelected = branding.quickAccessIds.includes(product.id);
                                                            if (isSelected) {
                                                                setBranding({
                                                                    ...branding,
                                                                    quickAccessIds: branding.quickAccessIds.filter(id => id !== product.id)
                                                                });
                                                            } else if (branding.quickAccessIds.length < 10) {
                                                                setBranding({
                                                                    ...branding,
                                                                    quickAccessIds: [...branding.quickAccessIds, product.id]
                                                                });
                                                            } else {
                                                                toast.error('Máximo 10 productos permitidos');
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {product.imagen_url && (
                                                                <img src={product.imagen_url} alt="" className="w-8 h-8 rounded object-cover" />
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium text-foreground">{product.nombre}</span>
                                                                <span className="text-[10px] text-muted-foreground">{product.categoria}</span>
                                                            </div>
                                                        </div>
                                                        {branding.quickAccessIds.includes(product.id) && (
                                                            <CheckCircle2 className="w-4 h-4 text-gold" />
                                                        )}
                                                    </div>
                                                ))}
                                                {products.length === 0 && (
                                                    <p className="text-xs text-zinc-500 text-center py-4 italic">No hay productos disponibles para seleccionar.</p>
                                                )}
                                            </div>
                                            <div className="mt-3 flex justify-between items-center px-1">
                                                <span className="text-[10px] text-muted-foreground">
                                                    Seleccionados: {branding.quickAccessIds.length} / 10
                                                </span>
                                                {branding.quickAccessIds.length > 0 && (
                                                    <button
                                                        className="text-[10px] text-muted-foreground hover:text-foreground underline"
                                                        onClick={() => setBranding({ ...branding, quickAccessIds: [] })}
                                                    >
                                                        Limpiar Selección
                                                    </button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <p className="text-[10px] text-zinc-500 italic">
                                        Estos productos aparecerán como botones de acceso directo en la pantalla principal del TPV.
                                    </p>
                                </div>

                                <Button
                                    className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={handleSaveBranding}
                                    disabled={isSavingBusiness}
                                >
                                    {isSavingBusiness ? 'Guardando...' : 'Guardar Identidad Visual'}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="text-foreground">Previsualización</CardTitle>
                                <CardDescription>Así se verán tus elementos principales</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-6 rounded-xl border border-border bg-muted/30 flex flex-col items-center gap-4 text-center">
                                    <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold shadow-lg" style={{ backgroundColor: branding.primaryColor, color: 'white' }}>
                                        DS
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-foreground">Ejemplo de Botón</h4>
                                        <Button size="sm" style={{ backgroundColor: branding.primaryColor, color: 'white' }}>
                                            Acción Principal
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge style={{ backgroundColor: branding.primaryColor + '20', color: branding.primaryColor, borderColor: branding.primaryColor + '40' }}>
                                            Etiqueta
                                        </Badge>
                                        <div className="text-sm font-bold" style={{ color: branding.primaryColor }}>
                                            $ 1.500,00
                                        </div>
                                    </div>
                                </div>
                                <Alert className="bg-muted border-border">
                                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                    <AlertDescription className="text-muted-foreground text-xs">
                                        La personalización afecta al POS, Catálogo Online y Panel Administrativo.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* USERS TAB */}
                <TabsContent value="users">
                    <UserManagement />
                </TabsContent>

                {/* AFIP TAB */}
                <TabsContent value="afip">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-foreground">
                                <ShieldCheck className="w-5 h-5 text-gold" />
                                Configuración Fiscal AFIP
                            </CardTitle>
                            <CardDescription>
                                Gestiona tus certificados digitales y conexión con el Web Service de AFIP.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert className="bg-muted border-border">
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                <AlertDescription className="text-muted-foreground text-sm">
                                    Para emitir Facturas A y B legales, debes cargar tus certificados .crt y .key obtenidos desde la web de AFIP.
                                </AlertDescription>
                            </Alert>
                            <Button
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                                onClick={() => window.location.href = '/settings/afip'}
                            >
                                Gestionar Certificados AFIP
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
