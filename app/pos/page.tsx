'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, setDoc, Timestamp, doc, runTransaction, getDoc, orderBy, limit, updateDoc, increment, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ShoppingBag, DollarSign, Keyboard, Bell, History, Eye, Search, Tag, Package, Store, RotateCcw } from 'lucide-react';
import { ShoppingCart } from '@/components/pos/ShoppingCart';
import { WeighableModal } from '@/components/pos/WeighableModal';
import { CheckoutDialog } from '@/components/pos/CheckoutDialog';
import { RegisterCloseDialog } from '@/components/pos/RegisterCloseDialog';
import { RegisterOpenDialog } from '@/components/pos/RegisterOpenDialog';
import { PendingOrdersDialog } from '@/components/pos/PendingOrdersDialog';
import { PickupPanel } from '@/components/pos/PickupPanel';
import { ReturnDialog } from '@/components/sales/ReturnDialog';
import {
    Dialog as UIDialog,
    DialogContent as UIDialogContent,
    DialogHeader as UIDialogHeader,
    DialogTitle as UIDialogTitle,
    DialogDescription as UIDialogDescription,
} from '@/components/ui/dialog';
import { SaleDetailsDialog } from '@/components/pos/SaleDetailsDialog';
import { ProductSelectorDialog } from '@/components/pos/ProductSelectorDialog';
import { QuickAccessGrid } from '@/components/pos/QuickAccessGrid';
import { Product, Customer, PaymentMethod, InvoiceType, Sale, Invoice, CashRegister, OnlineOrder, Order, OrderType } from '@/lib/types';
import { useBranding } from '@/contexts/BrandingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useReactToPrint } from 'react-to-print';
import { startOfDay } from 'date-fns';
import { useCart } from '@/hooks/useCart';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { db } from '@/lib/firebase/config';
import { formatCurrency, toDate, cleanUndefined, cn } from '@/lib/utils';
import { generateCAE, getNextInvoiceNumber, calculateIVADetails } from '@/lib/fiscal/afipService';
import { useAfipInvoice } from '@/lib/hooks/useAfipInvoice';
import { ThermalReceipt } from '@/components/fiscal/ThermalReceipt';
import { toast } from 'sonner';

const DEFAULT_BUSINESS_DATA = {
    nombre: 'DataSense Tienda',
    cuit: '20-30456789-5',
    direccion: 'Av. Corrientes 1234, CABA',
    telefono: '011 4455-6677',
    puntoVenta: 1
};

// Force rebuild
export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [dailySales, setDailySales] = useState<Sale[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isWeighModalOpen, setIsWeighModalOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isRegisterCloseOpen, setIsRegisterCloseOpen] = useState(false);
    const [isRegisterOpenDialogOpen, setIsRegisterOpenDialogOpen] = useState(false);
    const [registerSession, setRegisterSession] = useState<CashRegister | null>(null);
    const [showHotkeys, setShowHotkeys] = useState(false);
    const [lastSaleData, setLastSaleData] = useState<{ sale: Sale; invoice?: Invoice } | null>(null);
    const [loading, setLoading] = useState(false);
    const [businessData, setBusinessData] = useState(DEFAULT_BUSINESS_DATA);
    const [pendingOrders, setPendingOrders] = useState<OnlineOrder[]>([]);
    const [isPendingOrdersOpen, setIsPendingOrdersOpen] = useState(false);
    const [isPickupOpen, setIsPickupOpen] = useState(false);
    const [isReturnOpen, setIsReturnOpen] = useState(false);
    const [recentSales, setRecentSales] = useState<Sale[]>([]);
    const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<Sale | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
    const [selectedProductForSelector, setSelectedProductForSelector] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Retail States
    const [orderType, setOrderType] = useState<'local' | 'envio' | 'retiro'>('local');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
    const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState<Customer | null>(null);

    const { user } = useAuth();
    const { tenantId } = useTenant();
    const { config } = useBranding();
    const { items, addItem, getTotal, clearCart } = useCart();

    // Memoize total to prevent re-renders in children when other state changes (like shortcuts)
    const total = React.useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);

    const receiptRef = useRef<HTMLDivElement>(null);
    const { generateAfipInvoice } = useAfipInvoice();

    const handlePrintClient = useReactToPrint({
        contentRef: receiptRef,
        onAfterPrint: () => setLastSaleData(null),
    });


    // Load products in real-time
    // Load products in real-time
    // Load products in real-time
    useEffect(() => {
        let q;
        if (user?.rol === 'superadmin') {
            q = query(
                collection(db, 'products'),
                where('activo', '==', true),
                where('tipo', '==', 'producto')
            );
        } else {
            if (!tenantId) return;
            q = query(
                collection(db, 'products'),
                where('tenantId', '==', tenantId),
                where('activo', '==', true),
                where('tipo', '==', 'producto')
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
            })) as Product[];
            setProducts(productsData);
        });

        return () => unsubscribe();
    }, [tenantId, user?.rol]);

    // Load customers
    useEffect(() => {
        let q;
        if (user?.rol === 'superadmin') {
            q = query(
                collection(db, 'customers'),
                where('activo', '==', true)
            );
        } else {
            if (!tenantId) return;
            q = query(
                collection(db, 'customers'),
                where('tenantId', '==', tenantId),
                where('activo', '==', true)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const customersData = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
            })) as Customer[];
            setCustomers(customersData);
        });

        return () => unsubscribe();
    }, [tenantId, user?.rol]);

    // Load sales for the current register session
    useEffect(() => {
        if (!tenantId || !registerSession?.fecha_apertura) {
            setDailySales([]);
            return;
        }

        const q = query(
            collection(db, 'sales'),
            where('tenantId', '==', tenantId),
            where('fecha', '>=', registerSession.fecha_apertura)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const salesData = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
            })) as Sale[];
            setDailySales(salesData);
        });

        return () => unsubscribe();
    }, [registerSession?.fecha_apertura]);

    // Check for active Register Session
    useEffect(() => {
        if (!user?.id || !tenantId) return;

        const q = query(
            collection(db, 'cash_registers'),
            where('tenantId', '==', tenantId),
            where('usuario_id', '==', user.id),
            where('cerrada', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const sessionDoc = snapshot.docs[0];
                setRegisterSession({ id: sessionDoc.id, ...sessionDoc.data() } as CashRegister);
                setIsRegisterOpenDialogOpen(false);
            } else {
                setRegisterSession(null);
                setIsRegisterOpenDialogOpen(true);
            }
        });

        return () => unsubscribe();
    }, [user]);

    // Listen for Pending Online Orders
    useEffect(() => {
        if (!tenantId) return;
        const q = query(
            collection(db, 'online_orders'),
            where('tenantId', '==', tenantId),
            where('estado', '==', 'pendiente'),
            limit(20)
        );

        const playNotificationSound = () => {
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = 440;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            } catch (e) { console.error("Sound error:", e); }
        };

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
            })) as OnlineOrder[];

            // Sort locally to avoid Firebase Index requirement
            const sortedOrders = ordersData.sort((a, b) => {
                const dateA = a.fecha?.seconds || 0;
                const dateB = b.fecha?.seconds || 0;
                return dateB - dateA;
            });

            // Play sound if a new order arrives
            if (snapshot.docChanges().some(change => change.type === 'added') && sortedOrders.length > 0) {
                playNotificationSound();
            }

            setPendingOrders(sortedOrders);
        }, (error) => {
            console.error("Firestore listener error:", error);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(db, 'sales'),
            where('tenantId', '==', tenantId),
            orderBy('fecha', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const salesData = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
            })) as Sale[];
            setRecentSales(salesData);
        }, (error) => {
            console.error("Recent sales listener error:", error);
        });

        return () => unsubscribe();
    }, []);

    /* Mesas desactivadas para Retail
    useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(db, 'tables'),
            where('tenantId', '==', tenantId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tablesData = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            })) as Table[];
            setTables(tablesData.sort((a, b) => a.numero - b.numero));
        });

        return () => unsubscribe();
    }, [tenantId]);
    */


    const handleLoadOnlineOrder = async (order: OnlineOrder) => {
        try {
            // Add items to cart with full details
            for (const item of order.items) {
                addItem(
                    item.producto,
                    item.cantidad,
                    undefined,
                    item.selectedVariants,
                    item.selectedExtras,
                    item.notas
                );
            }

            // Mark as prepared/processing (locally for now, or update DB)
            await updateDoc(doc(db, 'online_orders', order.id), {
                estado: 'preparado'
            });

            setIsPendingOrdersOpen(false);
        } catch (error) {
            console.error("Error loading order:", error);
        }
    };

    // Load business data
    useEffect(() => {
        const loadBusinessData = async () => {
            try {
                const fiscalRef = doc(db, 'settings', 'fiscal');
                const snap = await getDoc(fiscalRef);
                if (snap.exists()) {
                    const data = snap.data();
                    setBusinessData({
                        nombre: data.nombre || DEFAULT_BUSINESS_DATA.nombre,
                        cuit: data.cuit || DEFAULT_BUSINESS_DATA.cuit,
                        direccion: data.direccion || DEFAULT_BUSINESS_DATA.direccion,
                        telefono: data.telefono || DEFAULT_BUSINESS_DATA.telefono,
                        puntoVenta: data.punto_venta || DEFAULT_BUSINESS_DATA.puntoVenta,
                    });
                }
            } catch (error) {
                console.error('Error loading business data:', error);
            }
        };
        loadBusinessData();
    }, []);

    const handleMainAction = () => {
        if (items.length === 0) return;
        setIsCheckoutOpen(true);
    };

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'F1': () => setShowHotkeys(!showHotkeys),
        'F2': () => setIsRegisterCloseOpen(true),
        'F8': handleMainAction,
        'Escape': () => {
            setIsWeighModalOpen(false);
            setIsCheckoutOpen(false);
        },
    });

    const handleProductScanned = React.useCallback((product: Product, weight?: number) => {
        if (product.es_pesable && weight) {
            addItem(product, 1, weight);
        } else if (!product.es_pesable) {
            // Check for variants or extras
            if ((product.variantes && product.variantes.length > 0) || (product.extras && product.extras.length > 0)) {
                setSelectedProductForSelector(product);
                setIsProductSelectorOpen(true);
            } else {
                addItem(product, 1);
            }
        }
    }, [addItem]);

    const handleProductSelectorConfirm = (
        product: Product,
        quantity: number,
        variants: any,
        extras: any,
        notes: string
    ) => {
        addItem(product, quantity, undefined, variants, extras, notes);
        setIsProductSelectorOpen(false);
        setSelectedProductForSelector(null);
    };

    const handleOpenWeighModal = React.useCallback((product: Product) => {
        setSelectedProduct(product);
        setIsWeighModalOpen(true);
    }, []);

    const handleWeighConfirm = (weight: number) => {
        if (selectedProduct) {
            addItem(selectedProduct, 1, weight);
        }
    };


    const handleCheckout = async (
        paymentMethod: PaymentMethod,
        invoiceType: InvoiceType,
        customerId?: string
    ) => {
        setLoading(true);
        try {
            let invoiceData: Invoice | undefined;
            // Prepare Sale and optionally Invoice

            // Prepare Sale and optionally Invoice
            await runTransaction(db, async (transaction) => {
                const saleRef = doc(collection(db, 'sales'));
                const salesId = saleRef.id;

                // 1. COLLECT ALL READS FIRST
                const productRefs = items.map(item => doc(db, 'products', item.producto.id));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                let customerDoc = null;
                if (customerId) {
                    const customerRef = doc(db, 'customers', customerId);
                    customerDoc = await transaction.get(customerRef);
                }

                // 2. CALCULATE AND PREPARE WRITES
                const updates: (() => void)[] = [];

                // Stock Updates Prep
                items.forEach((item, index) => {
                    const productDoc = productDocs[index];
                    if (!productDoc.exists()) throw new Error(`Producto ${item.producto.nombre} no encontrado`);

                    const currentStock = productDoc.data().stock_actual || 0;
                    const reduction = item.producto.es_pesable ? (item.peso_gramos || 0) / 1000 : item.cantidad;

                    updates.push(() => transaction.update(productRefs[index], {
                        stock_actual: currentStock - reduction,
                        updated_at: Timestamp.now()
                    }));

                    // RECIPE DEDUCTION
                    if (item.producto.receta && item.producto.receta.length > 0) {
                        const recipeMultiplier = item.cantidad;
                        item.producto.receta.forEach((ingredient: any) => {
                            const totalIngredientUsed = ingredient.cantidad * recipeMultiplier;
                            const ingredientRef = doc(db, 'products', ingredient.materia_prima_id);
                            updates.push(() => transaction.update(ingredientRef, {
                                stock_actual: increment(-totalIngredientUsed),
                                updated_at: Timestamp.now()
                            }));
                        });
                    }
                });

                // Customer CC Update Prep
                if (paymentMethod === 'cuenta_corriente' && customerDoc?.exists()) {
                    const currentSaldo = customerDoc.data().saldo_cuenta_corriente || 0;
                    updates.push(() => transaction.update(customerDoc!.ref, {
                        saldo_cuenta_corriente: currentSaldo - total,
                        updated_at: Timestamp.now()
                    }));
                }

                // 3. EXECUTE ALL WRITES
                let caeData = { cae: '', vencimiento: new Date() };
                let invoiceNumber = 0;

                if (invoiceType !== 'ticket') {
                    invoiceNumber = await getNextInvoiceNumber(transaction, invoiceType, businessData.puntoVenta);
                    const customer = customers.find(c => c.id === customerId);

                    // ✅ REAL AFIP INTEGRATION - Generate CAE from AFIP
                    try {
                        const afipResult = await generateAfipInvoice({
                            tipo_comprobante: invoiceType,
                            cliente_cuit: customer?.dni_cuit,
                            cliente_nombre: customer?.nombre || 'Consumidor Final',
                            total: total,
                            fecha: new Date(),
                            items: items
                        });

                        if (!afipResult.success) {
                            throw new Error(afipResult.error || 'Error al generar CAE de AFIP');
                        }

                        caeData = {
                            cae: afipResult.cae!,
                            vencimiento: new Date(afipResult.cae_vencimiento || new Date())
                        };
                    } catch (afipError: any) {
                        // If AFIP fails, abort transaction
                        throw new Error('AFIP: ' + afipError.message);
                    }

                    const { base, ivaAmount } = calculateIVADetails(total, 21);
                    invoiceData = {
                        id: salesId,
                        tipo: invoiceType,
                        numero: invoiceNumber,
                        punto_venta: businessData.puntoVenta,
                        fecha: Timestamp.now(),
                        cliente_nombre: customer?.nombre || 'Consumidor Final',
                        cliente_cuit: customer?.dni_cuit,
                        items: [...items],
                        subtotal: base,
                        iva_21: ivaAmount,
                        iva_105: 0,
                        total: total,
                        cae: caeData.cae,
                        vencimiento_cae: Timestamp.fromDate(caeData.vencimiento)
                    };
                }

                // 4. Create Sale Record
                const saleRecord: Sale = {
                    id: salesId,
                    tenantId: tenantId!,
                    items: [...items],
                    total: total,
                    metodo_pago: paymentMethod,
                    tipo_comprobante: invoiceType,
                    cliente_id: customerId || null as any,
                    usuario_id: user?.id || 'unknown',
                    fecha: Timestamp.now(),
                    cae: caeData.cae || null as any,
                    vencimiento_cae: caeData.cae ? Timestamp.fromDate(caeData.vencimiento) : null as any,
                    numero_comprobante: invoiceNumber ? `${businessData.puntoVenta.toString().padStart(4, '0')}-${invoiceNumber.toString().padStart(8, '0')}` : null as any
                };

                // HANDLE ORDER
                const orderRef = doc(collection(db, 'orders'));
                const finalOrder: Order = {
                    id: orderRef.id,
                    tenantId: tenantId!,
                    type: orderType as any,
                    status: 'completed',
                    items: [...items],
                    total: total,
                    cliente_id: customerId || null,
                    cliente_nombre: customers.find(c => c.id === customerId)?.nombre || null,
                    cliente_telefono: customers.find(c => c.id === customerId)?.telefono || null,
                    direccion_entrega: deliveryAddress,
                    usuario_id: user?.id || 'unknown',
                    pagado: true,
                    fecha: Timestamp.now(),
                    updated_at: Timestamp.now(),
                    notas: orderNotes
                };

                transaction.set(saleRef, cleanUndefined(saleRecord));
                transaction.set(orderRef, cleanUndefined(finalOrder));

                setLastSaleData({ sale: saleRecord, invoice: invoiceData });
            });

            clearCart();
            setOrderNotes('');
            setDeliveryAddress('');
            setTimeout(async () => {
                if (window.confirm('¿Desea imprimir el ticket para el CLIENTE?')) handlePrintClient();
                else setLastSaleData(null);
            }, 500);

        } catch (error) {
            console.error('Checkout error:', error);
            alert('Error en el proceso de cobro: ' + (error instanceof Error ? error.message : 'Desconocido'));
        } finally {
            setLoading(false);
        }
    };



    const getDailySalesSummary = () => {
        return dailySales.reduce((summary, sale) => {
            const method = sale.metodo_pago;
            if (method === 'efectivo') summary.efectivo += sale.total;
            else if (method === 'tarjeta_debito') summary.tarjeta_debito += sale.total;
            else if (method === 'tarjeta_credito') summary.tarjeta_credito += sale.total;
            else if (method === 'transferencia') summary.transferencia += sale.total;
            else if (method === 'cuenta_corriente') summary.cuenta_corriente += sale.total;

            summary.total += sale.total;
            return summary;
        }, {
            efectivo: 0,
            tarjeta_debito: 0,
            tarjeta_credito: 0,
            transferencia: 0,
            cuenta_corriente: 0,
            total: 0
        });
    };

    return (
        <div className="min-h-screen bg-background p-4">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-primary">DataSense Tienda</h1>
                    <p className="text-muted-foreground">Sistema de Punto de Venta Retail</p>
                </div>

                <div className="flex bg-muted p-1 rounded-lg border border-border">
                    <Button
                        variant={orderType === 'local' ? 'primary' : 'ghost'}
                        size="sm"
                        className={cn("rounded-md px-4", orderType === 'local' && "bg-primary text-primary-foreground")}
                        onClick={() => setOrderType('local')}
                    >
                        Local
                    </Button>
                    <Button
                        variant={orderType === 'envio' ? 'primary' : 'ghost'}
                        size="sm"
                        className={cn("rounded-md px-4", orderType === 'envio' && "bg-primary text-primary-foreground")}
                        onClick={() => setOrderType('envio')}
                    >
                        Envío
                    </Button>
                    <Button
                        variant={orderType === 'retiro' ? 'primary' : 'ghost'}
                        size="sm"
                        className={cn("rounded-md px-4", orderType === 'retiro' && "bg-primary text-primary-foreground")}
                        onClick={() => setOrderType('retiro')}
                    >
                        Retiro
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {pendingOrders.filter(o => o.tipo_entrega === 'retiro_tienda' && o.estado !== 'retirado' && o.estado !== 'cancelado').length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPickupOpen(!isPickupOpen)}
                            className="relative border-green-500/30 text-green-500 hover:bg-green-500/10"
                        >
                            <Store className="w-4 h-4 mr-2" />
                            Retiro
                            <Badge className="ml-1 h-4 min-w-4 text-[9px] bg-green-500 text-white">
                                {pendingOrders.filter(o => o.tipo_entrega === 'retiro_tienda' && o.estado !== 'retirado' && o.estado !== 'cancelado').length}
                            </Badge>
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHotkeys(!showHotkeys)}
                    >
                        <Keyboard className="w-4 h-4 mr-2" />
                        Atajos (F1)
                    </Button>
                </div>
            </div>

            {/* Hotkeys Help */}
            {showHotkeys && (
                <Card className="mb-4 border-border bg-muted/30">
                    <CardContent className="pt-6">
                        <h3 className="font-semibold mb-3">Atajos de Teclado</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div><Badge>F1</Badge> Ayuda</div>
                            <div><Badge>F2</Badge> Cierre de Caja</div>
                            <div><Badge>F8</Badge> Cobrar</div>
                            <div><Badge>ESC</Badge> Cancelar</div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[calc(100vh-180px)]">
                <div className="lg:col-span-3">
                    <Card className="h-full border-border bg-card flex flex-col overflow-hidden">
                        <CardContent className="p-4 h-full min-h-[400px] flex flex-col">
                            <div className="flex items-center justify-between mb-4 gap-4">
                                <h3 className="text-sm font-bold text-primary uppercase flex items-center gap-2">
                                    <Package className="w-4 h-4" /> Acceso Rápido
                                </h3>
                                <div className="relative flex-1 max-w-xs">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar producto..."
                                        className="pl-9 h-9 bg-background border-border focus:border-primary"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-1">
                                <QuickAccessGrid
                                    products={searchTerm
                                        ? products.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
                                        : products
                                    }
                                    onProductClick={handleProductScanned}
                                    quickAccessIds={searchTerm ? undefined : config?.branding?.quickAccessIds}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="flex-1">
                        <ShoppingCart />
                    </div>
                </div>

                {/* Right: Summary & Actions */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border-border bg-card shadow-sm">
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-muted-foreground">Items:</span>
                                    <span className="font-semibold">{items.length}</span>
                                </div>
                                <div className="flex justify-between items-center text-3xl font-bold">
                                    <span>TOTAL:</span>
                                    <span className="text-primary">{formatCurrency(total)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full text-xl h-20 shadow-2xl"
                        onClick={handleMainAction}
                        disabled={items.length === 0 || loading}
                    >
                        <DollarSign className="w-6 h-6 mr-2" />
                        Cobrar (F8)
                    </Button>

                    {/* Retail Details Fields */}
                    <div className="space-y-3 pt-2">
                        {orderType === 'envio' && (
                            <Input
                                placeholder="Dirección de Envío..."
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                className="bg-background border-border focus:border-primary"
                            />
                        )}
                        <Input
                            placeholder="Notas / Observaciones..."
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            className="bg-background border-border focus:border-primary text-xs"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            disabled={items.length === 0}
                            onClick={clearCart}
                            className="border-border hover:bg-accent"
                        >
                            Limpiar
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsRegisterCloseOpen(true)}
                            className="border-border hover:bg-accent"
                        >
                            Cerrar Caja
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsReturnOpen(true)}
                        className="w-full border-border hover:bg-accent text-xs"
                    >
                        <RotateCcw className="w-3 h-3 mr-2" />
                        Devoluciones (BORIS)
                    </Button>
                </div>
            </div>

            {/* Modals */}
            <WeighableModal
                product={selectedProduct}
                isOpen={isWeighModalOpen}
                onClose={() => setIsWeighModalOpen(false)}
                onConfirm={handleWeighConfirm}
            />

            <CheckoutDialog
                isOpen={isCheckoutOpen}
                total={total}
                onClose={() => setIsCheckoutOpen(false)}
                onConfirm={handleCheckout}
                customers={customers}
                cartItems={items}
            />

            <RegisterCloseDialog
                isOpen={isRegisterCloseOpen}
                onClose={() => setIsRegisterCloseOpen(false)}
                salesSummary={getDailySalesSummary()}
                currentSessionId={registerSession?.id}
                initialAmount={registerSession?.monto_inicial}
                cajeroNombre={registerSession?.cajero_nombre}
            />

            <ProductSelectorDialog
                isOpen={isProductSelectorOpen}
                onClose={() => setIsProductSelectorOpen(false)}
                product={selectedProductForSelector}
                onConfirm={handleProductSelectorConfirm}
            />

            <RegisterOpenDialog
                isOpen={isRegisterOpenDialogOpen}
                onOpenSuccess={() => setIsRegisterOpenDialogOpen(false)}
            />


            <PendingOrdersDialog
                orders={pendingOrders}
                isOpen={isPendingOrdersOpen}
                onClose={() => setIsPendingOrdersOpen(false)}
                onLoadOrder={handleLoadOnlineOrder}
            />

            <UIDialog open={isPickupOpen} onOpenChange={setIsPickupOpen}>
                <UIDialogContent className="sm:max-w-[600px] bg-card border-border">
                    <UIDialogHeader>
                        <UIDialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Store className="w-5 h-5 text-primary" />
                            Pedidos para Retirar en Tienda
                        </UIDialogTitle>
                        <UIDialogDescription>
                            Gestioná los pedidos que los clientes vienen a retirar.
                        </UIDialogDescription>
                    </UIDialogHeader>
                    <PickupPanel orders={pendingOrders} />
                </UIDialogContent>
            </UIDialog>

            <ReturnDialog
                isOpen={isReturnOpen}
                onClose={() => setIsReturnOpen(false)}
            />

            <SaleDetailsDialog
                sale={selectedSaleForDetails}
                customer={customers.find(c => c.id === selectedSaleForDetails?.cliente_id) || null}
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
            />

            {/* Hidden Receipts for Printing */}
            <div className="hidden">
                {lastSaleData && (
                    <ThermalReceipt
                        ref={receiptRef}
                        sale={lastSaleData.sale}
                        invoice={lastSaleData.invoice}
                        businessData={businessData}
                    />
                )}
            </div>

            {loading && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-lg font-medium">Procesando Venta...</p>
                        <p className="text-sm text-muted-foreground">Conectando con AFIP</p>
                    </div>
                </div>
            )}
        </div>
    );
}
