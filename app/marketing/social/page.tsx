'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ImageIcon,
    Download,
    Palette,
    Sparkles,
    Instagram,
    Phone,
    Upload,
    Trash2
} from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { useBranding } from '@/contexts/BrandingContext';
import { formatCurrency } from '@/lib/utils';
import * as htmlToImage from 'html-to-image';
import { toast } from 'sonner';

const PRESET_BACKGROUNDS = [
    {
        id: 'abstract_orange',
        name: 'Curvas Naranja',
        url: '/images/backgrounds/bg_abstract_orange.jpg'
    },
    {
        id: 'bistro',
        name: 'Bistro Acogedor',
        url: '/images/backgrounds/bg_cozy_bistro.png'
    },
    {
        id: 'dark_texture',
        name: 'Textura Oscura',
        url: '/images/backgrounds/bg_dark_texture.jpg'
    },
    {
        id: 'fun_pattern',
        name: 'Patrón Fun',
        url: '/images/backgrounds/bg_fun_pattern.jpg'
    },
    {
        id: 'liquid_gold',
        name: 'Oro Líquido',
        url: '/images/backgrounds/bg_liquid_gold.jpg'
    },
    {
        id: 'bg3',
        name: 'Iconos Rojos (bg3)',
        url: '/images/backgrounds/bg_red_icons_v2.jpg'
    }
];

export default function SocialMediaHub() {
    const { tenantId } = useTenant();
    const { config } = useBranding();
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
    const [promoPrice, setPromoPrice] = useState('');
    const [promoText, setPromoText] = useState('¡OFERTA IMPERDIBLE!');
    const [socialHandle, setSocialHandle] = useState(config?.social?.instagram || '@tuelocal');
    const [phoneNumber, setPhoneNumber] = useState(config?.telefono || '');
    const [template, setTemplate] = useState<'story' | 'post'>('story');
    const [customBackground, setCustomBackground] = useState<string | null>(null);
    const [selectedPreset, setSelectedPreset] = useState<string | null>(PRESET_BACKGROUNDS[0].id);
    const [isGenerating, setIsGenerating] = useState(false);
    const flyerRef = useRef<HTMLDivElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            if (!tenantId) return;
            try {
                // Correctly Query TOP-LEVEL 'products' collection, filtering by tenantId
                // NOTE: removed orderBy to prevent index errors
                const q = query(
                    collection(db, 'products'),
                    where('tenantId', '==', tenantId),
                    where('activo', '==', true),
                    where('tipo', '==', 'producto')
                );

                const querySnapshot = await getDocs(q);
                const prods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

                // Client-side sort
                const sortedProds = prods.sort((a, b) => a.nombre.localeCompare(b.nombre));

                setProducts(sortedProds);
            } catch (error) {
                console.error("Error fetching products:", error);
                toast.error("Error al cargar productos");
            }
        };
        fetchProducts();
    }, [tenantId]);

    useEffect(() => {
        if (config?.social?.instagram) setSocialHandle(config.social.instagram);
        if (config?.telefono) setPhoneNumber(config.telefono);
    }, [config]);

    const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setCustomBackground(url);
        }
    };

    const handleClearBg = () => {
        if (customBackground) {
            URL.revokeObjectURL(customBackground);
            setCustomBackground(null);
        }
        setSelectedPreset(null);
    };

    const activeBgUrl = customBackground || PRESET_BACKGROUNDS.find(p => p.id === selectedPreset)?.url;

    const handleDownload = async () => {
        if (!flyerRef.current) return;
        setIsGenerating(true);
        try {
            // Usar html-to-image para mejor soporte de estilos modernos (filtros, rotaciones, sombras)
            const dataUrl = await htmlToImage.toPng(flyerRef.current, {
                cacheBust: true,
                quality: 1.0,
                pixelRatio: 3, // Alta resolución
                backgroundColor: 'transparent',
            });

            const link = document.createElement('a');
            const fileName = selectedProducts.length > 0
                ? selectedProducts.map(p => p.nombre).join('-').substring(0, 30)
                : 'promo';
            link.download = `promo-${fileName}.png`;
            link.href = dataUrl;
            link.click();
            toast.success('¡Flyer generado con éxito!');
        } catch (error) {
            console.error('Error al generar imagen:', error);
            toast.error('Error al generar el flyer');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
                        <Sparkles className="w-8 h-8" /> Social Media Hub
                    </h1>
                    <p className="text-muted-foreground">Generá promociones profesionales en segundos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Panel de Control */}
                <div className="space-y-6">
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Palette className="w-5 h-5 text-gold" /> Configurar Promo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>1. Seleccioná los Productos (para Combos)</Label>
                                <Select onValueChange={(id) => {
                                    const prod = products.find(p => p.id === id);
                                    if (prod && !selectedProducts.find(p => p.id === id)) {
                                        setSelectedProducts([...selectedProducts, prod]);
                                    }
                                }}>
                                    <SelectTrigger className="bg-muted border-border w-full relative z-[50]">
                                        <SelectValue placeholder={products.length > 0 ? "Agregar producto a la promo..." : "Cargando productos..."} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground z-[100]">
                                        {products.length > 0 ? (
                                            products.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>No hay productos disponibles</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>

                                {selectedProducts.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {selectedProducts.map(p => (
                                            <div key={p.id} className="bg-zinc-800 px-3 py-1 rounded-full text-xs flex items-center gap-2 border border-zinc-700">
                                                {p.nombre}
                                                <button
                                                    onClick={() => setSelectedProducts(selectedProducts.filter(item => item.id !== p.id))}
                                                    className="hover:text-red-500"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Precio Normal (Total)</Label>
                                    <Input
                                        readOnly
                                        value={selectedProducts.length > 0
                                            ? formatCurrency(selectedProducts.reduce((acc, p) => acc + (p.precio_venta || 0), 0))
                                            : '-'}
                                        className="bg-zinc-800 border-zinc-700 opacity-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gold">Precio de Oferta</Label>
                                    <Input
                                        type="number"
                                        placeholder="Ej: 5500"
                                        value={promoPrice}
                                        onChange={(e) => setPromoPrice(e.target.value)}
                                        className="bg-muted border-border border-gold/30 focus:border-gold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Texto de la Promo</Label>
                                <Input
                                    placeholder="¡OFERTA IMPERDIBLE!"
                                    value={promoText}
                                    onChange={(e) => setPromoText(e.target.value)}
                                    className="bg-muted border-border"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Instagram className="w-4 h-4" /> Instagram / Social
                                    </Label>
                                    <Input
                                        placeholder="@tuelocal"
                                        value={socialHandle}
                                        onChange={(e) => setSocialHandle(e.target.value)}
                                        className="bg-muted border-border"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Phone className="w-4 h-4" /> Teléfono de Pedidos
                                    </Label>
                                    <Input
                                        placeholder="WhatsApp"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="bg-muted border-border"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs text-muted-foreground uppercase tracking-wider font-bold">
                                    <span>2. Fondo del Flyer</span>
                                    {(customBackground || selectedPreset) && (
                                        <button
                                            onClick={handleClearBg}
                                            className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1 normal-case font-normal"
                                        >
                                            <Trash2 className="w-3 h-3" /> Limpiar
                                        </button>
                                    )}
                                </div>

                                {/* Presets Grid */}
                                <div className="grid grid-cols-3 gap-2">
                                    {PRESET_BACKGROUNDS.map((bg) => (
                                        <div
                                            key={bg.id}
                                            onClick={() => {
                                                if (customBackground) handleClearBg();
                                                setSelectedPreset(bg.id);
                                            }}
                                            className={`relative aspect-[9/16] rounded-md overflow-hidden cursor-pointer border-2 transition-all group ${selectedPreset === bg.id && !customBackground
                                                ? 'border-gold shadow-[0_0_10px_rgba(255,188,13,0.3)]'
                                                : 'border-transparent hover:border-white/20'
                                                }`}
                                        >
                                            <img
                                                src={bg.url}
                                                alt={bg.name}
                                                crossOrigin="anonymous"
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                                                <span className="text-[10px] text-white font-bold truncate w-full">{bg.name}</span>
                                            </div>
                                            {selectedPreset === bg.id && !customBackground && (
                                                <div className="absolute top-1 right-1 bg-gold rounded-full p-0.5">
                                                    <Sparkles className="w-2 h-2 text-black" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Custom Upload Toggle/Button */}
                                <div
                                    onClick={() => bgInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-lg p-2.5 cursor-pointer transition-all flex items-center justify-center gap-2 ${customBackground
                                        ? 'border-gold bg-gold/5'
                                        : 'border-zinc-800 hover:bg-zinc-800/50'
                                        }`}
                                >
                                    <input
                                        type="file"
                                        ref={bgInputRef}
                                        onChange={handleBgUpload}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                    <Upload className={`w-4 h-4 ${customBackground ? 'text-gold' : 'text-zinc-500'}`} />
                                    <span className="text-xs font-medium text-muted-foreground truncate">
                                        {customBackground ? 'Personalizado cargado' : 'O subir uno propio...'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>3. Formato</Label>
                                <div className="flex gap-4">
                                    <Button
                                        variant={template === 'story' ? 'gold' : 'outline'}
                                        onClick={() => setTemplate('story')}
                                        className="flex-1"
                                    >
                                        Story (9:16)
                                    </Button>
                                    <Button
                                        variant={template === 'post' ? 'gold' : 'outline'}
                                        onClick={() => setTemplate('post')}
                                        className="flex-1"
                                    >
                                        Post (1:1)
                                    </Button>
                                </div>
                            </div>

                            <Button
                                className="w-full h-12 text-lg font-bold"
                                disabled={selectedProducts.length === 0 || isGenerating}
                                onClick={handleDownload}
                            >
                                {isGenerating ? 'Generando...' : (
                                    <>
                                        <Download className="w-5 h-5 mr-2" /> Descargar Imagen
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Vista Previa */}
                <div className="flex justify-center">
                    <div className="sticky top-6">
                        <p className="text-center text-sm text-muted-foreground mb-4">Vista Previa</p>

                        <div
                            ref={flyerRef}
                            id="flyer-capture"
                            className={`relative overflow-hidden shadow-2xl bg-[#0c0c0e] ${template === 'story' ? 'w-[360px] h-[640px]' : 'w-[400px] h-[400px]'}`}
                        >
                            {/* Ribbon "COMBO IMPERDIBLE!" */}
                            <div className={`absolute bg-[#FFBC0D] text-black font-extrabold uppercase tracking-wider text-center shadow-xl z-50 border-y-[3px] border-white/20 block leading-none -rotate-45 ${template === 'story'
                                ? 'top-[38px] left-[-68px] w-[240px] py-3 text-[12px]'
                                : 'top-[40px] left-[-70px] w-[240px] py-3 text-[10px]'
                                }`}>
                                <span className="block mb-0.5">{template === 'story' ? 'PROMO' : 'COMBO'}</span>
                                <span className="block">IMPERDIBLE!</span>
                            </div>
                            {/* Background Layer: Custom or Default */}
                            {activeBgUrl ? (
                                <img
                                    src={activeBgUrl}
                                    alt="Background"
                                    crossOrigin="anonymous"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-[#0c0c0e]" />
                            )}

                            {/* Overlay Gradient for Premium Look */}
                            <div className={`absolute inset-0 pointer-events-none z-[1] ${activeBgUrl ? 'bg-gradient-to-t from-black/80 via-black/20 to-black/40' : 'bg-gradient-to-t from-black/60 via-transparent to-black/20'}`} />

                            {/* Template Content */}
                            <div className={`absolute inset-0 flex flex-col items-center text-center z-10 ${template === 'story' ? 'pt-4 px-8 pb-12' : 'pt-3 px-6 pb-4'}`}>

                                {/* Brand/Logo Header */}
                                <div className={`w-full flex items-center justify-center ${template === 'story' ? 'mb-6' : 'mb-3'}`}>
                                    <div className="flex-1 h-[1px] bg-white/10" />
                                    <div className="mx-4">
                                        {config?.branding?.logoUrl ? (
                                            <div className="overflow-hidden flex items-center justify-center min-w-[100px]">
                                                <img
                                                    src={config.branding.logoUrl}
                                                    alt="Logo"
                                                    crossOrigin="anonymous"
                                                    className={`${template === 'story' ? 'h-24' : 'h-20'} w-auto object-contain max-w-[220px]`}
                                                />
                                            </div>
                                        ) : (
                                            <span className="bg-[#FFBC0D] text-black px-6 py-2 text-xs uppercase font-black tracking-[0.2em] rounded-full shadow-lg whitespace-nowrap">
                                                {config?.nombre || 'DataSense Food'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 h-[1px] bg-white/10" />
                                </div>

                                {/* Image Container Area */}
                                <div className={`relative w-full ${template === 'story' ? 'h-[320px]' : 'h-44'}`}>
                                    {selectedProducts.length > 0 ? (
                                        <div className="w-full h-full relative flex items-center justify-center p-4">
                                            {/* Layout para 1 Producto */}
                                            {selectedProducts.length === 1 && (
                                                <div className={`relative overflow-hidden border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-zinc-900 ${template === 'story' ? 'w-full h-full rounded-[1.5rem] border' : 'w-[80%] aspect-square rounded-2xl border-4 border-[#FFBC0D]'
                                                    }`}>
                                                    <img
                                                        src={selectedProducts[0].imagen_url}
                                                        alt={selectedProducts[0].nombre}
                                                        crossOrigin="anonymous"
                                                        className={`w-full h-full ${template === 'story' ? 'object-contain p-4' : 'object-cover'}`}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
                                                </div>
                                            )}

                                            {/* Layout para 2 y 3+ Productos */}
                                            {selectedProducts.length >= 2 && (
                                                <div className="w-full h-full relative flex items-center justify-center gap-2">
                                                    {template === 'story' ? (
                                                        <>
                                                            {/* Producto Principal (Top Center) */}
                                                            <div className="absolute top-[-10px] left-[12.5%] w-[75%] h-[75%] overflow-hidden rounded-2xl border-2 border-white/10 shadow-2xl bg-zinc-900 z-10">
                                                                <img
                                                                    src={selectedProducts[0].imagen_url}
                                                                    alt={selectedProducts[0].nombre}
                                                                    crossOrigin="anonymous"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                                                            </div>
                                                            {/* Producto 2 (Derecha Abajo) */}
                                                            <div className="absolute bottom-0 right-0 w-[42%] aspect-square overflow-hidden rounded-xl border-2 border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-zinc-900 z-20">
                                                                <img
                                                                    src={selectedProducts[1].imagen_url}
                                                                    alt={selectedProducts[1].nombre}
                                                                    crossOrigin="anonymous"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            {/* Producto 3 (Izquierda Abajo) */}
                                                            {selectedProducts.length >= 3 && (
                                                                <div className="absolute bottom-0 left-0 w-[42%] aspect-square overflow-hidden rounded-xl border-2 border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-zinc-900 z-20">
                                                                    <img
                                                                        src={selectedProducts[2].imagen_url}
                                                                        alt={selectedProducts[2].nombre}
                                                                        crossOrigin="anonymous"
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="flex items-end justify-center gap-1 w-full px-2 mt-4">
                                                            {/* Horizontal layout for Post (1:1) */}
                                                            <div className="w-[30%] aspect-square overflow-hidden rounded-xl border-[3px] border-[#FFBC0D] shadow-xl bg-zinc-900">
                                                                <img
                                                                    src={selectedProducts[selectedProducts.length >= 3 ? 2 : 1].imagen_url}
                                                                    alt="product side left"
                                                                    crossOrigin="anonymous"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <div className="w-[45%] aspect-square overflow-hidden rounded-2xl border-[4px] border-[#FFBC0D] shadow-[0_20px_40px_rgba(0,0,0,0.6)] bg-zinc-900 z-10 -mx-2 -mb-2 scale-110">
                                                                <img
                                                                    src={selectedProducts[0].imagen_url}
                                                                    alt="product main center"
                                                                    crossOrigin="anonymous"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <div className="w-[30%] aspect-square overflow-hidden rounded-xl border-[3px] border-[#FFBC0D] shadow-xl bg-zinc-900">
                                                                <img
                                                                    src={selectedProducts[1].imagen_url}
                                                                    alt="product side right"
                                                                    crossOrigin="anonymous"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-20">
                                            <ImageIcon className="w-16 h-16 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Offer Badge */}
                                {promoPrice && (
                                    <div className={`absolute z-40 transition-all duration-300 ${template === 'story'
                                        ? 'left-4 top-[35%] -translate-y-1/2'
                                        : 'right-2 top-[6%]'
                                        }`}>
                                        <div className={`relative bg-[#C02424] text-white rounded-full shadow-[0_15px_40px_rgba(192,36,36,0.6)] border-4 border-white flex items-center justify-center ${template === 'story' ? 'w-24 h-24 rotate-[-15deg]' : 'w-32 h-32 scale-90 rotate-[15deg]'
                                            }`}>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center px-1">
                                                <span className={`block font-black uppercase tracking-[0.2em] opacity-90 leading-none ${template === 'story' ? 'text-[9px] mb-1' : 'text-[11px] mb-1.5'}`}>
                                                    {template === 'story' ? '¡SOLO!' : 'A SOLO'}
                                                </span>
                                                <div className="flex items-center justify-center leading-none">
                                                    <span className={`font-black mr-0.5 ${template === 'story' ? 'text-lg translate-y-[1px]' : 'text-2xl mt-1'}`}>$</span>
                                                    <span className={`font-black tracking-tighter ${template === 'story'
                                                        ? (promoPrice.length > 5 ? 'text-lg' : promoPrice.length > 4 ? 'text-xl' : 'text-2xl')
                                                        : (promoPrice.length > 5 ? 'text-2xl' : 'text-3xl')
                                                        }`}>
                                                        {promoPrice}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Text Content Area - MOVED INSIDE Template Content */}
                                <div className={`w-full flex-1 flex flex-col justify-center ${template === 'story' ? 'mt-4' : 'mt-2'}`}>
                                    <h2 className="text-[#FFBC0D] text-[10px] font-black tracking-[0.3em] uppercase mb-2 drop-shadow-sm">
                                        {promoText}
                                    </h2>

                                    <h3 className={`font-black text-white leading-tight tracking-tight drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] mb-3 ${template === 'story' ? 'text-base px-6' : 'text-sm'}`}>
                                        {selectedProducts.length > 0
                                            ? selectedProducts.map(p => p.nombre).join(' + ')
                                            : 'PROMO DEL DÍA'}
                                    </h3>

                                    <div className="mt-auto flex flex-col items-center justify-center border-t border-white/5 pt-4">
                                        <div className="flex items-center justify-center gap-x-4 mb-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <Instagram className="w-4 h-4 text-[#FFBC0D]" />
                                                <span className="text-white text-xs font-black tracking-tight">{socialHandle}</span>
                                            </div>
                                            {phoneNumber && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-[#FFBC0D]" />
                                                    <span className="text-white text-xs font-black tracking-tight">{phoneNumber}</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-white/40 text-[9px] uppercase font-black tracking-[0.2em]">¡Reservá la tuya ahora!</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
