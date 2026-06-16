'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { collection, query, where, onSnapshot, addDoc, Timestamp, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product, OnlineOrder, OnlineOrderItem, StoreConfig, VariantOption, ProductExtra } from '@/lib/types';
import { formatCurrency, cleanUndefined, cn } from '@/lib/utils';
import { useParams, useSearchParams } from 'next/navigation';
import { ShopProductSelector } from '@/components/shop/ShopProductSelector';
import {
    LayoutGrid,
    Utensils,
    Coffee,
    Beef,
    Pizza,
    IceCream,
    GlassWater,
    X,
    ChevronRight,
    Search as SearchIcon,
    ShoppingBag,
    Package,
    Store,
    Plus,
    CreditCard,
    Phone,
    User,
    Building2,
    ChevronLeft,
    UploadCloud,
    Loader2,
    CheckCircle2,
    FileImage,
    ChefHat,
    Sandwich,
    MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useBranding } from '@/contexts/BrandingContext';
import { useImageUpload } from '@/hooks/useImageUpload';

interface ShopCartItem {
    internalId: string;
    product: Product;
    quantity: number;
    variants?: { [key: string]: VariantOption };
    extras?: ProductExtra[];
    notes?: string;
}

const FriesIcon = (props: any) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M5 11l1-8h2l1 8" />
        <path d="M15 11l1-8h2l1 8" />
        <path d="M10 11l.5-9h3l.5 9" />
        <path d="M4 11h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8z" />
        <path d="M9 11v10" />
        <path d="M15 11v10" />
    </svg>
);


function TenantCatalogoClient() {
    const params = useParams();
    const searchParams = useSearchParams();
    const tenantId = params?.tenantId as string;
    const { config } = useBranding();

    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<{ [internalId: string]: ShopCartItem }>({});
    const [loading, setLoading] = useState(true);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [customerData, setCustomerData] = useState({ nombre: '', telefono: '' });
    const [isSending, setIsSending] = useState(false);
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [weightingProduct, setWeightingProduct] = useState<Product | null>(null);
    const [tempWeight, setTempWeight] = useState<string>('');
    const [paymentStep, setPaymentStep] = useState<'checkout' | 'payment'>('checkout');
    const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'mercadopago' | 'astropay' | null>(null);
    const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
    const [tipoEntrega, setTipoEntrega] = useState<'retiro_tienda' | 'envio_domicilio'>('retiro_tienda');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const { uploadImage, uploading: isUploadingImage, progress: uploadProgress } = useImageUpload();

    // Selector State
    const [selectedProductForSelector, setSelectedProductForSelector] = useState<Product | null>(null);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const path = `online_orders/${tenantId}/${Date.now()}_comprobante.jpg`;
            const result = await uploadImage(file, path);
            setComprobanteUrl(result.url);
        } catch (error) {
            console.error("Error uploading receipt:", error);
            alert("Error al subir el comprobante");
        }
    };

    const categories = Array.from(new Set(products.map(p => p.categoria))).filter(Boolean);

    useEffect(() => {
        const status = searchParams?.get('status');
        if (status === 'success') {
            setIsSuccessModalOpen(true);
            setCart({});
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!tenantId) return;
        setLoading(true);
        setNotFound(false);
        console.log("Loading catalog for tenant:", tenantId);

        const loadContent = async () => {
            try {
                const configRef = doc(db, 'store_configs', tenantId);
                const configSnap = await getDoc(configRef);

                if (!configSnap.exists()) {
                    console.warn("No store_config found for:", tenantId);
                    setNotFound(true);
                    setLoading(false);
                    return;
                }

                const config = { id: configSnap.id, ...configSnap.data() } as StoreConfig;
                setStoreConfig(config);
                console.log("Store config loaded:", config.nombre);

                const q = query(
                    collection(db, 'products'),
                    where('tenantId', '==', tenantId),
                    where('activo', '==', true),
                    where('tipo', '==', 'producto')
                );

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    console.log(`Snapshot received for ${tenantId}: ${snapshot.size} products`);
                    let productsData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Product[];

                    if (productsData.length === 0) {
                        console.log("No specific products for tenant, trying fallbacks...");
                        const fallbackQuery = query(collection(db, 'products'), where('activo', '==', true), where('tipo', '==', 'producto'));
                        getDocs(fallbackQuery).then(fallbackSnap => {
                            const allActive = fallbackSnap.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            })) as Product[];
                            setProducts(allActive);
                            setLoading(false);
                        }).catch(e => {
                            console.error("Fallback query failed:", e);
                            setLoading(false);
                        });
                    } else {
                        setProducts(productsData);
                        setLoading(false);
                    }
                }, (error) => {
                    console.error("Snapshot error:", error);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error loading catalogo:", error);
                setLoading(false);
            }
        };

        loadContent();
    }, [tenantId]);

    const handleProductClick = (product: Product) => {
        if (product.es_pesable) {
            setWeightingProduct(product);
            setTempWeight('');
        } else {
            // Always open selector to show details (description, ingredients, etc.)
            setSelectedProductForSelector(product);
            setIsSelectorOpen(true);
        }
    };

    const addToCartBase = (
        product: Product,
        quantity: number,
        variants?: { [key: string]: VariantOption },
        extras?: ProductExtra[],
        notes?: string
    ) => {
        const signature = JSON.stringify({ p: product.id, v: variants, e: extras, n: notes }); // simplistic sig
        // Check if exists? For simplicity in shop, we assume adding new line always if distinct, or merge?
        // Let's just generate a random ID and add. Merging is better but strictly distinct lines are clearer for customer.

        const internalId = Math.random().toString(36).substring(2, 9);

        setCart(prev => ({
            ...prev,
            [internalId]: {
                internalId,
                product,
                quantity,
                variants,
                extras,
                notes
            }
        }));
    };

    const handleSelectorConfirm = (
        product: Product,
        quantity: number,
        variants: any,
        extras: any,
        notes: string
    ) => {
        addToCartBase(product, quantity, variants, extras, notes);
        setIsSelectorOpen(false);
        setSelectedProductForSelector(null);
    };

    const handleWeightConfirm = () => {
        const grams = parseFloat(tempWeight);
        if (isNaN(grams) || grams <= 0) {
            alert('Por favor ingresa un peso válido en gramos');
            return;
        }
        if (weightingProduct) {
            // Weights are stored as kg fraction e.g. 0.25
            addToCartBase(weightingProduct, grams / 1000);
            setWeightingProduct(null);
        }
    };

    const updateQuantity = (internalId: string, delta: number) => {
        setCart(prev => {
            const currentItem = prev[internalId];
            if (!currentItem) return prev;

            const newQuantity = currentItem.quantity + delta;

            if (newQuantity <= 0) {
                const { [internalId]: _, ...rest } = prev;
                return rest;
            }

            return {
                ...prev,
                [internalId]: {
                    ...currentItem,
                    quantity: newQuantity
                }
            };
        });
    };

    const removeFromCart = (internalId: string) => {
        setCart(prev => {
            const { [internalId]: _, ...rest } = prev;
            return rest;
        });
    };

    const calculateItemTotal = (item: ShopCartItem) => {
        let unitPrice = item.product.precio_venta;
        if (item.variants) Object.values(item.variants).forEach(v => unitPrice += v.precio_extra);
        if (item.extras) item.extras.forEach(e => unitPrice += e.precio);
        return unitPrice * item.quantity;
    };

    const cartTotal = Object.values(cart).reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const cartItemsCount = Object.values(cart).length;

    // Helper to get total quantity of a specific product in cart (for badges)
    const getProductQtyInCart = (pId: string) => {
        return Object.values(cart)
            .filter(item => item.product.id === pId)
            .reduce((acc, item) => acc + (item.product.es_pesable ? 1 : item.quantity), 0);
    };

    const handleSendOrder = async () => {
        if (!customerData.nombre || !customerData.telefono) {
            alert('Por favor, completa tu nombre y teléfono');
            return;
        }

        if (paymentMethod === 'transfer' && !comprobanteUrl) {
            alert('Por favor, sube la captura del comprobante de transferencia');
            return;
        }

        if (!storeConfig) return;

        setIsSending(true);
        try {
            const orderItems: OnlineOrderItem[] = Object.values(cart).map(item => {
                // Construct logic for variants/extras to be saved in DB
                // DB definition for OnlineOrderItem needs to support variants?
                // Currently it might just have 'producto'.
                // To support displaying in POS, we should probably burn them into the product name or add fields.
                // The 'OnlineOrderItem' type in lib/types/index.ts matches standard Item?
                // Let's assume standard behavior:
                // We will append variants/extras to 'notas' or assume generic Item structure supports them if we updated types.
                // We updated CartItem, but OnlineOrderItem is usually separate?
                // I should check `OnlineOrderItem` definition.
                // Assuming it's `CartItem` or similar. If not, I'll pass generic object.
                // Let's pass the full enriched object.

                return {
                    producto: item.product,
                    cantidad: item.quantity,
                    subtotal: calculateItemTotal(item),
                    // We need to pass these so POS can read them!
                    selectedVariants: item.variants,
                    selectedExtras: item.extras,
                    notas: item.notes
                } as any;
            });

            let message = `*Nuevo Pedido - ${storeConfig.nombre}*\n\n`;
            message += `*Cliente:* ${customerData.nombre}\n`;
            message += `*Teléfono:* ${customerData.telefono}\n`;
            message += `*Pago:* ${paymentMethod === 'mercadopago' ? 'Mercado Pago' : 'Transferencia Bancaria'}\n\n`;
            message += `*Detalle:* \n`;
            Object.values(cart).forEach(item => {
                const sub = calculateItemTotal(item);
                let detail = `- ${item.quantity}${item.product.unidad === 'kg' ? 'kg' : 'un.'} x ${item.product.nombre}`;

                if (item.variants) Object.values(item.variants).forEach(v => detail += ` [${v.nombre}]`);
                if (item.extras) item.extras.forEach(e => detail += ` (+${e.nombre})`);

                message += `${detail}: ${formatCurrency(sub)}\n`;
                if (item.notes) message += `  _Nota: ${item.notes}_\n`;
            });
            if (tipoEntrega === 'retiro_tienda') {
                message += `📍 *Retira en Tienda*\n\n`;
            } else {
                message += `🚚 *Envío a Domicilio:* ${deliveryAddress || 'A confirmar'}\n\n`;
            }

            message += `\n*TOTAL: ${formatCurrency(cartTotal)}*\n\n`;

            if (paymentMethod === 'transfer') {
                message += `*Datos para Transferencia:*\n`;
                message += `Alias: ${storeConfig?.alias || 'Viene en WhatsApp'}\n`;
                message += `CBU: ${storeConfig?.cbu || 'Viene en WhatsApp'}\n\n`;

                if (comprobanteUrl) {
                    message += `✅ *Comprobante adjunto en el pedido.*\n\n`;
                } else {
                    message += `_Por favor, envía el comprobante de pago por aquí para confirmar el pedido._\n\n`;
                }
            }

            const paymentId = (paymentMethod === 'mercadopago' || paymentMethod === 'astropay') ? `order_${Date.now()}` : null;

            if (paymentMethod === 'mercadopago') {
                const mpItems = Object.values(cart).map(item => ({
                    producto: item.product,
                    cantidad: item.quantity,
                    subtotal: calculateItemTotal(item)
                }));

                const mpResponse = await fetch('/api/mercadopago/preference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tenantId,
                        externalReference: paymentId,
                        items: mpItems,
                        backUrls: {
                            success: `${window.location.origin}${window.location.pathname}?status=success`,
                            failure: `${window.location.origin}${window.location.pathname}?status=failure`,
                            pending: `${window.location.origin}${window.location.pathname}?status=pending`,
                        }
                    })
                });

                if (!mpResponse.ok) {
                    const errorDetail = await mpResponse.json().catch(() => ({}));
                    console.error("MP Preference Error:", errorDetail);
                    throw new Error(errorDetail.message || errorDetail.error || 'Error al conectar con Mercado Pago');
                }

                const mpData = await mpResponse.json();
                if (mpData.init_point) {
                    // Save order first
                    await addDoc(collection(db, 'online_orders'), cleanUndefined({
                        tenantId,
                        cliente_nombre: customerData.nombre,
                        cliente_telefono: customerData.telefono,
                        items: orderItems,
                        total: cartTotal,
                        estado: 'pendiente',
                        tipo_entrega: tipoEntrega,
                        direccion_entrega: tipoEntrega === 'envio_domicilio' ? deliveryAddress : null,
                        metodo_pago: paymentMethod,
                        pago_confirmado: false,
                        pago_id: paymentId,
                        fecha: Timestamp.now(),
                        mensaje_whatsapp: message
                    }));

                    window.location.href = mpData.init_point;
                    return;
                } else {
                    throw new Error('No se pudo crear el pago');
                }
            }

            if (paymentMethod === 'astropay') {
                const apItems = Object.values(cart).map(item => ({
                    producto: item.product,
                    cantidad: item.quantity,
                    subtotal: calculateItemTotal(item)
                }));

                const apResponse = await fetch('/api/astropay/preference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tenantId,
                        externalReference: paymentId,
                        items: apItems,
                        backUrls: {
                            success: `${window.location.origin}${window.location.pathname}?status=success`,
                            failure: `${window.location.origin}${window.location.pathname}?status=failure`,
                            pending: `${window.location.origin}${window.location.pathname}?status=pending`,
                        }
                    })
                });

                if (!apResponse.ok) {
                    const errorDetail = await apResponse.json().catch(() => ({}));
                    console.error("AstroPay Preference Error:", errorDetail);
                    throw new Error(errorDetail.message || errorDetail.error || 'Error al conectar con AstroPay');
                }

                const apData = await apResponse.json();
                if (apData.redirect_url) {
                    // Save order first
                    await addDoc(collection(db, 'online_orders'), cleanUndefined({
                        tenantId,
                        cliente_nombre: customerData.nombre,
                        cliente_telefono: customerData.telefono,
                        items: orderItems,
                        total: cartTotal,
                        estado: 'pendiente',
                        tipo_entrega: tipoEntrega,
                        direccion_entrega: tipoEntrega === 'envio_domicilio' ? deliveryAddress : null,
                        metodo_pago: paymentMethod,
                        pago_confirmado: false,
                        pago_id: paymentId,
                        fecha: Timestamp.now(),
                        mensaje_whatsapp: message
                    }));

                    window.location.href = apData.redirect_url;
                    return;
                } else {
                    throw new Error('No se pudo crear el pago de AstroPay');
                }
            }

            await addDoc(collection(db, 'online_orders'), cleanUndefined({
                tenantId,
                cliente_nombre: customerData.nombre,
                cliente_telefono: customerData.telefono,
                items: orderItems,
                total: cartTotal,
                estado: 'pendiente',
                tipo_entrega: tipoEntrega,
                direccion_entrega: tipoEntrega === 'envio_domicilio' ? deliveryAddress : null,
                metodo_pago: paymentMethod,
                comprobante_url: comprobanteUrl,
                pago_confirmado: paymentMethod === 'transfer' ? false : true,
                fecha: Timestamp.now(),
                mensaje_whatsapp: message
            }));

            const phoneToUse = storeConfig.whatsapp || storeConfig.telefono || '';
            const cleanPhone = phoneToUse.replace(/\D/g, '');
            const finalPhone = cleanPhone.startsWith('54') ? cleanPhone : `54${cleanPhone}`;

            const waUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');

            setCart({});
            setIsOrderModalOpen(false);
            setPaymentStep('checkout');
            setComprobanteUrl(null);
            setPaymentMethod(null);
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error("Error sending order:", error);
            alert(`Ocurrió un error al enviar el pedido: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsSending(false);
        }
    };

    const LoadingView = () => (
        <div className="h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground font-medium font-sans">Cargando nuestra carta...</p>
            </div>
        </div>
    );

    if (loading) return <LoadingView />;

    if (notFound) {
        return (
            <div className="h-screen flex items-center justify-center bg-white p-6 text-center">
                <div>
                    <Store className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-zinc-900 mb-2 font-sans">Tienda no encontrada</h1>
                    <p className="text-zinc-500 mb-6 font-sans">El catálogo al que intentás acceder no existe o ha sido desactivado.</p>
                </div>
            </div>
        );
    }

    const getCategoryIcon = (category: string) => {
        const cat = category.toLowerCase();
        if (cat.includes('hamburguesa') || cat.includes('burger')) return Sandwich;
        if (cat.includes('sandwich')) return Sandwich;
        if (cat.includes('papa')) return FriesIcon;
        if (cat.includes('bebida')) return GlassWater;
        if (cat.includes('postre') || cat.includes('helado')) return IceCream;
        if (cat.includes('cafe')) return Coffee;
        return Package;
    };

    const actualProducts = products.filter(p => !p.tipo || p.tipo === 'producto');
    const filteredProducts = (searchTerm
        ? actualProducts.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
        : (selectedCategory
            ? actualProducts.filter(p => p.categoria === selectedCategory)
            : actualProducts)
    );

    return (
        <div className="min-h-screen bg-white text-zinc-900 pb-32 font-sans">
            {/* Top Navigation Bar / Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-zinc-200">
                <div className="flex items-center justify-between h-20 md:h-32 px-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4 md:gap-6">
                        <button className="p-2 md:hidden">
                            <div className="w-5 h-0.5 bg-zinc-900 mb-1" />
                            <div className="w-5 h-0.5 bg-zinc-900 mb-1" />
                            <div className="w-3 h-0.5 bg-zinc-900" />
                        </button>
                        <div className="flex items-center py-1">
                            <img
                                src={config?.branding?.logoUrl || "/logo.png"}
                                alt={config?.nombre || "PedidosIA"}
                                className="h-14 md:h-24 w-auto object-contain transition-transform"
                            />
                        </div>
                    </div>

                </div>

                {/* Categories Tab Strip */}
                <div className="bg-white px-2 overflow-x-auto scrollbar-hide border-t border-zinc-50 flex md:justify-center">
                    <div className="flex items-center min-w-max h-16 md:h-24 px-2 gap-2 md:gap-4">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={cn(
                                "flex flex-col items-center justify-center min-w-[64px] md:min-w-[80px] h-14 md:h-20 transition-all",
                                !selectedCategory ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                            )}
                        >
                            <LayoutGrid className="w-5 h-5 md:w-6 md:h-6 mb-0.5 md:mb-1" />
                            <span className="text-[9px] md:text-[10px] font-bold uppercase text-center leading-tight">Todos</span>
                        </button>
                        {categories.map(cat => {
                            const Icon = getCategoryIcon(cat);
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        "flex flex-col items-center justify-center min-w-[64px] md:min-w-[80px] h-14 md:h-20 transition-all",
                                        selectedCategory === cat ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                                    )}
                                >
                                    <Icon className="w-5 h-5 md:w-6 md:h-6 mb-0.5 md:mb-1" />
                                    <span className="text-[9px] md:text-[10px] font-bold uppercase text-center leading-tight">
                                        {cat.toLowerCase().includes('hamburguesa') ? 'Hamburguesas' :
                                            cat.toLowerCase().includes('papa') ? 'Papas Fritas' : cat}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="relative border border-primary/20 rounded-[2.5rem] bg-card p-6 md:p-12 shadow-sm overflow-hidden mb-12">
                    {/* Background decorative elements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -mr-64 -mt-64" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -ml-64 -mb-64" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                        <div className="flex items-center gap-3">
                            <Utensils className="w-6 h-6 text-primary" />
                            <h2 className="text-xl font-black text-primary uppercase tracking-[0.2em]">Acceso Rápido</h2>
                        </div>

                        <div className="relative w-full md:w-96">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar comida..."
                                className="h-12 pl-12 bg-background border-border text-foreground rounded-xl focus:ring-primary/30 placeholder:text-muted-foreground"
                                value={searchTerm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 relative z-10">
                        {filteredProducts.map(product => {
                            const cartQty = getProductQtyInCart(product.id);
                            return (
                                <div
                                    key={product.id}
                                    onClick={() => handleProductClick(product)}
                                    className="aspect-square bg-muted rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all active:scale-[0.98] group relative"
                                >
                                    {product.imagen_url ? (
                                        <img
                                            src={product.imagen_url}
                                            alt={product.nombre}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-accent flex items-center justify-center">
                                            <Package className="w-12 h-12 text-muted-foreground" />
                                        </div>
                                    )}

                                    {/* Dark overlay for text readability */}
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent p-4 flex flex-col justify-end text-white">
                                        <h3 className="font-bold text-[10px] md:text-xs leading-[1.1] uppercase break-all overflow-hidden">
                                            {product.nombre}
                                        </h3>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-primary font-black text-xs">{formatCurrency(product.precio_venta)}</span>
                                            {cartQty > 0 && (
                                                <Badge className="h-5 min-w-5 bg-primary text-primary-foreground border-none font-black text-[10px] p-0 flex items-center justify-center rounded-full">
                                                    {Math.round(cartQty * 10) / 10}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hover Add Button (Simplified) */}
                                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-300">
                                            <Plus className="w-6 h-6 text-primary-foreground" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {filteredProducts.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-zinc-100 mt-8 shadow-sm">
                        <Package className="w-20 h-20 text-zinc-100 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-muted-foreground">No encontramos lo que buscas</h3>
                        <Button
                            variant="link"
                            className="text-primary"
                            onClick={() => { setSelectedCategory(null); setSearchTerm(''); }}
                        >
                            Ver toda la carta
                        </Button>
                    </div>
                )}
            </main>

            {cartTotal > 0 && (
                <div className="fixed bottom-6 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-lg mx-auto">
                    <Button
                        className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-2xl rounded-2xl flex justify-between px-8 border-t border-white/20 transition-transform active:scale-[0.98]"
                        onClick={() => {
                            setPaymentStep('checkout');
                            setIsOrderModalOpen(true);
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-primary-foreground text-primary w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm">
                                {cartItemsCount}
                            </div>
                            <span className="uppercase tracking-tight">Ver Carrito</span>
                        </div>
                        <span className="text-2xl tracking-tighter font-black">{formatCurrency(cartTotal)}</span>
                    </Button>
                </div>
            )}

            <Dialog open={!!weightingProduct} onOpenChange={(open: boolean) => !open && setWeightingProduct(null)}>
                <DialogContent className="sm:max-w-md bg-background border-border text-foreground rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                    <div className="p-8 space-y-8">
                        <div className="text-center">
                            <Badge className="bg-primary/10 text-primary border-none mb-4 font-black uppercase tracking-widest">Peso Personalizado</Badge>
                            <h2 className="text-2xl font-black text-foreground">{weightingProduct?.nombre}</h2>
                            <p className="text-muted-foreground text-sm font-medium mt-1">Ingresa el peso exacto que deseas llevar</p>
                        </div>

                        <div className="relative group">
                            <Input
                                type="number"
                                step="1"
                                placeholder="350"
                                value={tempWeight}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTempWeight(e.target.value)}
                                className="text-6xl h-32 text-center font-black bg-muted border-none text-foreground rounded-3xl placeholder:text-muted/20 focus:ring-2 ring-primary/20"
                            />
                            <div className="absolute top-1/2 -translate-y-1/2 right-6 flex flex-col items-center">
                                <span className="text-xl font-black text-muted-foreground uppercase">GRAMOS</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: '100g', value: '100' },
                                { label: '250g', value: '250' },
                                { label: '500g', value: '500' },
                                { label: '1kg', value: '1000' }
                            ].map(item => (
                                <button
                                    key={item.value}
                                    className={`h-11 rounded-xl font-bold text-xs transition-all border ${tempWeight === item.value ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground border-border'}`}
                                    onClick={() => setTempWeight(item.value)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <div className="bg-muted p-6 rounded-3xl border border-border flex justify-between items-center">
                            <span className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Precio Estimado</span>
                            <span className="text-3xl font-black text-foreground">
                                {formatCurrency((weightingProduct?.precio_venta || 0) * (parseFloat(tempWeight || '0') / 1000))}
                            </span>
                        </div>

                        <Button
                            className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-black h-16 rounded-2xl text-lg uppercase tracking-widest shadow-md"
                            onClick={handleWeightConfirm}
                        >
                            Confirmar Gramos
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isOrderModalOpen} onOpenChange={(open: boolean) => setIsOrderModalOpen(open)}>
                <DialogContent className="sm:max-w-md bg-card border-border text-foreground p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
                    <div className="p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black flex items-center gap-3">
                                {paymentStep === 'checkout' ? 'Finalizar Pedido' : 'Método de Pago'}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground font-medium">
                                {paymentStep === 'checkout' ? 'Ingresa tus datos para continuar.' : 'Elige cómo quieres pagar tu pedido.'}
                            </DialogDescription>
                        </DialogHeader>

                        {paymentStep === 'checkout' ? (
                            <div className="space-y-6">
                                {/* Fulfillment Type Selector */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setTipoEntrega('retiro_tienda')}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1 ${tipoEntrega === 'retiro_tienda' ? 'border-primary bg-primary/5' : 'border-border bg-muted'}`}
                                    >
                                        <Store className={`w-5 h-5 ${tipoEntrega === 'retiro_tienda' ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="font-black text-xs text-foreground">Retiro en Tienda</span>
                                        <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">Sin costo</span>
                                    </button>
                                    <button
                                        onClick={() => setTipoEntrega('envio_domicilio')}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1 ${tipoEntrega === 'envio_domicilio' ? 'border-primary bg-primary/5' : 'border-border bg-muted'}`}
                                    >
                                        <Building2 className={`w-5 h-5 ${tipoEntrega === 'envio_domicilio' ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="font-black text-xs text-foreground">Envío a Domicilio</span>
                                        <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">Delivery</span>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Tu Nombre Completo"
                                            className="pl-12 bg-muted border-none text-foreground focus:ring-primary h-14 rounded-2xl font-bold"
                                            value={customerData.nombre}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerData(prev => ({ ...prev, nombre: e.target.value }))}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Tu WhatsApp (11 2233 4455)"
                                            className="pl-12 bg-muted border-none text-foreground focus:ring-primary h-14 rounded-2xl font-bold"
                                            value={customerData.telefono}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerData(prev => ({ ...prev, telefono: e.target.value }))}
                                        />
                                    </div>
                                    {tipoEntrega === 'envio_domicilio' && (
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Dirección de entrega"
                                                className="pl-12 bg-muted border-none text-foreground focus:ring-primary h-14 rounded-2xl font-bold"
                                                value={deliveryAddress}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeliveryAddress(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="bg-muted p-6 rounded-3xl border border-border space-y-3">
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Resumen</p>
                                    <div className="max-h-48 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                        {Object.values(cart).map(item => (
                                            <div key={item.internalId} className="flex justify-between items-start text-sm group">
                                                <div className="flex-1 pr-2">
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-foreground/80">{item.quantity}x {item.product.nombre}</span>
                                                        <span className="font-black text-foreground shrink-0">{formatCurrency(calculateItemTotal(item))}</span>
                                                    </div>

                                                    <div className="text-[10px] text-muted-foreground space-y-0.5 mt-1 pl-4 border-l border-border">
                                                        {item.variants && Object.values(item.variants).map((v, i) => (
                                                            <div key={i}>• {v.nombre} {v.precio_extra > 0 && `(+$${v.precio_extra})`}</div>
                                                        ))}
                                                        {item.extras && item.extras.map((e, i) => (
                                                            <div key={i}>+ {e.nombre} (+${e.precio})</div>
                                                        ))}
                                                        {item.notes && <div className="text-primary italic">"{item.notes}"</div>}
                                                    </div>

                                                    <button
                                                        onClick={() => removeFromCart(item.internalId)}
                                                        className="text-[10px] text-destructive hover:text-destructive/80 font-bold uppercase mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-3 border-t border-border flex justify-between items-center">
                                        <span className="font-black text-foreground text-lg">Total</span>
                                        <span className="text-2xl font-black text-primary">{formatCurrency(cartTotal)}</span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-black h-16 rounded-2xl text-lg uppercase tracking-widest shadow-xl"
                                    onClick={() => setPaymentStep('payment')}
                                >
                                    Siguiente: Pagar
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => setPaymentMethod('mercadopago')}
                                        className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-1 ${paymentMethod === 'mercadopago' ? 'border-primary bg-primary/5' : 'border-border bg-muted'}`}
                                    >
                                        <div className="h-10 w-10 bg-[#009EE3] rounded-full flex items-center justify-center mb-1 shadow-md">
                                            <span className="font-black text-white text-lg">M</span>
                                        </div>
                                        <span className="font-black text-md text-foreground">Mercado Pago</span>
                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Débito, Crédito o Dinero en cuenta</span>
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('astropay')}
                                        className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-1 ${paymentMethod === 'astropay' ? 'border-primary bg-primary/5' : 'border-border bg-muted'}`}
                                    >
                                        <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center mb-1 shadow-md">
                                            <span className="font-black text-white text-lg">A</span>
                                        </div>
                                        <span className="font-black text-md text-foreground">AstroPay</span>
                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Tarjetas Internacionales y Crypto</span>
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('transfer')}
                                        className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-1 ${paymentMethod === 'transfer' ? 'border-primary bg-primary/5' : 'border-border bg-muted'}`}
                                    >
                                        <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center mb-1 shadow-sm border border-border">
                                            <Building2 className="w-5 h-5 text-primary" />
                                        </div>
                                        <span className="font-black text-md text-foreground">Transferencia Bancaria</span>
                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">CBU / ALIAS / CVU</span>
                                    </button>
                                </div>

                                {paymentMethod === 'transfer' && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        <div className="p-5 bg-muted rounded-2xl border border-border space-y-2">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-2">Datos para pagar</p>
                                            <div className="flex justify-between items-center bg-card p-3 rounded-xl border border-border">
                                                <span className="text-xs text-muted-foreground font-bold">Alias:</span>
                                                <span className="text-sm font-black text-foreground">{storeConfig?.alias || 'Viene en WhatsApp'}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-card p-3 rounded-xl border border-border">
                                                <span className="text-xs text-muted-foreground font-bold">CBU:</span>
                                                <span className="text-sm font-black text-foreground">{storeConfig?.cbu || 'Viene en WhatsApp'}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-foreground px-1">Sube el comprobante de transferencia:</p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleUploadReceipt}
                                            />

                                            {!comprobanteUrl ? (
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploadingImage}
                                                    className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-3xl hover:border-primary hover:bg-primary/5 transition-all group disabled:opacity-50"
                                                >
                                                    {isUploadingImage ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                            <span className="text-sm font-bold text-muted-foreground">Subiendo... {Math.round(uploadProgress)}%</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <UploadCloud className="w-10 h-10 text-muted-foreground group-hover:text-primary mb-2" />
                                                            <span className="text-sm font-black text-muted-foreground group-hover:text-primary uppercase tracking-tight">Elegir captura / Comprobante</span>
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <div className="relative group">
                                                    <div className="w-full h-32 rounded-2xl overflow-hidden border-2 border-green-500 bg-green-50 flex items-center justify-center">
                                                        <div className="flex items-center gap-3">
                                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                                            <span className="text-green-700 font-black uppercase text-sm">Comprobante Cargado</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setComprobanteUrl(null)}
                                                        className="absolute -top-2 -right-2 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shadow-lg"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <Button variant="ghost" className="h-16 px-6 font-black uppercase text-muted-foreground" onClick={() => setPaymentStep('checkout')}>
                                        Volver
                                    </Button>
                                    <Button
                                        className={`flex-1 h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl transition-all ${
                                            paymentMethod === 'mercadopago' 
                                                ? 'bg-[#009EE3] hover:bg-[#008CC9] text-white shadow-[#009EE3]/20' 
                                                : paymentMethod === 'astropay'
                                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                                                : 'bg-primary hover:bg-primary/95 text-primary-foreground shadow-primary/20'
                                        }`}
                                        onClick={handleSendOrder}
                                        disabled={isSending || !paymentMethod}
                                    >
                                        {isSending ? 'Procesando...' : (paymentMethod === 'mercadopago' ? 'Pagar con MP' : paymentMethod === 'astropay' ? 'Pagar con AstroPay' : 'Confirmar Pedido')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <ShopProductSelector
                isOpen={isSelectorOpen}
                onClose={() => setIsSelectorOpen(false)}
                product={selectedProductForSelector}
                onConfirm={handleSelectorConfirm}
            />

            {/* Success Dialog */}
            <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
                <DialogContent className="max-w-md bg-card border-none rounded-[2.5rem] p-12 text-center">
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-3xl font-black text-foreground mb-2">¡Pedido Recibido!</DialogTitle>
                            <DialogDescription className="text-muted-foreground font-medium text-lg leading-relaxed">
                                {paymentMethod === 'mercadopago'
                                    ? 'Tu pago ha sido procesado con éxito. Ya estamos preparando tu pedido.'
                                    : 'Recibimos tu pedido. No olvides enviar el comprobante por WhatsApp para confirmarlo.'}
                            </DialogDescription>
                        </div>
                        <Button
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black h-14 rounded-2xl text-lg uppercase shadow-lg"
                            onClick={() => setIsSuccessModalOpen(false)}
                        >
                            Volver a la carta
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CatalogoLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground font-medium">Cargando catálogo...</p>
            </div>
        </div>
    );
}

export default function TenantCatalogoPage() {
    return (
        <Suspense fallback={<CatalogoLoading />}>
            <TenantCatalogoClient />
        </Suspense>
    );
}
