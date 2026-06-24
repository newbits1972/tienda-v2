'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, Timestamp, doc, runTransaction, getDoc, orderBy, limit, updateDoc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { DollarSign, Keyboard, Store, RotateCcw, Search, Package } from 'lucide-react';
import { ShoppingCart } from '@/components/pos/ShoppingCart';
import { CheckoutDialog } from '@/components/pos/CheckoutDialog';
import { RegisterCloseDialog } from '@/components/pos/RegisterCloseDialog';
import { RegisterOpenDialog } from '@/components/pos/RegisterOpenDialog';
import { PickupPanel } from '@/components/pos/PickupPanel';
import { ReturnDialog } from '@/components/sales/ReturnDialog';
import {
    Dialog as UIDialog,
    DialogContent as UIDialogContent,
    DialogHeader as UIDialogHeader,
    DialogTitle as UIDialogTitle,
    DialogDescription as UIDialogDescription,
} from '@/components/ui/dialog';
import { Product, Customer, PaymentMethod, InvoiceType, Sale, Invoice, CashRegister, OnlineOrder } from '@/lib/types';
import { useBranding } from '@/contexts/BrandingContext';
import { useBranch } from '@/contexts/BranchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useReactToPrint } from 'react-to-print';
import { useCart } from '@/hooks/useCart';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { db } from '@/lib/firebase/config';
import { formatCurrency, cleanUndefined, cn } from '@/lib/utils';
import { generateCAE, getNextInvoiceNumber, calculateIVADetails } from '@/lib/fiscal/afipService';
import { useAfipInvoice } from '@/lib/hooks/useAfipInvoice';
import { ThermalReceipt } from '@/components/fiscal/ThermalReceipt';
import { VariantSelectorDialog } from '@/components/pos/VariantSelectorDialog';
import { QuickAccessGrid } from '@/components/pos/QuickAccessGrid';
import { toast } from 'sonner';

const DEFAULT_BUSINESS_DATA = {
    nombre: 'DataSense Retail',
    cuit: '20-30456789-5',
    direccion: 'Av. Corrientes 1234, CABA',
    telefono: '011 4455-6677',
    puntoVenta: 1
};


export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [dailySales, setDailySales] = useState<Sale[]>([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isRegisterCloseOpen, setIsRegisterCloseOpen] = useState(false);
    const [isRegisterOpenDialogOpen, setIsRegisterOpenDialogOpen] = useState(false);
    const [registerSession, setRegisterSession] = useState<CashRegister | null>(null);
    const [showHotkeys, setShowHotkeys] = useState(false);
    const [lastSaleData, setLastSaleData] = useState<{ sale: Sale; invoice?: Invoice } | null>(null);
    const [loading, setLoading] = useState(false);
    const [businessData, setBusinessData] = useState(DEFAULT_BUSINESS_DATA);
    const [pendingOrders, setPendingOrders] = useState<OnlineOrder[]>([]);
    const [isPickupOpen, setIsPickupOpen] = useState(false);
    const [isReturnOpen, setIsReturnOpen] = useState(false);
    const [isVariantSelectorOpen, setIsVariantSelectorOpen] = useState(false);
    const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { user } = useAuth();
    const { tenantId } = useTenant();
    const { config } = useBranding();
    const { items, addItem, getTotal, clearCart } = useCart();
    const { activeBranchId } = useBranch();

    // Memoize total to prevent re-renders in children when other state changes
    const total = React.useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);

    const receiptRef = useRef<HTMLDivElement>(null);
    const { generateAfipInvoice } = useAfipInvoice();

    const handlePrintClient = useReactToPrint({
        contentRef: receiptRef,
        onAfterPrint: () => setLastSaleData(null),
    });

    // Load products in real-time
    useEffect(() => {
        let q;
        if (user?.rol === 'superadmin') {
            q = query(collection(db, 'products'), where('activo', '==', true));
        } else {
            if (!tenantId) return;
            q = query(
                collection(db, 'products'),
                where('tenantId', '==', tenantId),
                where('activo', '==', true)
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
            q = query(collection(db, 'customers'), where('activo', '==', true));
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
            where('fecha', '>=', registerSession.fecha_apertura),
            orderBy('fecha', 'desc')
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

    // Listen for Pending Online Orders (BOPIS / retiro en tienda)
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

            const sortedOrders = ordersData.sort((a, b) => {
                const dateA = a.fecha?.seconds || 0;
                const dateB = b.fecha?.seconds || 0;
                return dateB - dateA;
            });

            if (snapshot.docChanges().some(change => change.type === 'added') && sortedOrders.length > 0) {
                playNotificationSound();
            }

            setPendingOrders(sortedOrders);
        }, (error) => {
            console.error("Firestore listener error:", error);
        });

        return () => unsubscribe();
    }, []);

    const handleLoadOnlineOrder = async (order: OnlineOrder) => {
        try {
            for (const item of order.items) {
                addItem(item.producto, item.variante, item.cantidad);
            }
            await updateDoc(doc(db, 'online_orders', order.id), {
                estado: 'preparado'
            });
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
        'Escape': () => setIsCheckoutOpen(false),
    });

    /**
     * Cuando se clickea un producto en la grilla:
     * - Si tiene matriz talle×color definida → abre selector de variante
     * - Si no → agrega directo (productos sin variantes)
     */
    const handleProductClick = (product: Product) => {
        const tieneMatriz = (product.talles_disponibles && product.talles_disponibles.length > 0)
            || (product.colores_disponibles && product.colores_disponibles.length > 0);

        if (tieneMatriz) {
            setSelectedProductForVariant(product);
            setIsVariantSelectorOpen(true);
        } else {
            addItem(product, undefined, 1);
        }
    };

    const handleVariantSelected = (product: Product, variant: any, cantidad: number) => {
        addItem(product, variant, cantidad);
        setIsVariantSelectorOpen(false);
        setSelectedProductForVariant(null);
    };

    const handleCheckout = async (
        paymentMethod: PaymentMethod,
        invoiceType: InvoiceType,
        customerId?: string,
        totalFinal?: number
    ) => {
        setLoading(true);
        const totalVenta = totalFinal !== undefined ? totalFinal : total;
        try {
            let invoiceData: Invoice | undefined;

            await runTransaction(db, async (transaction) => {
                const saleRef = doc(collection(db, 'sales'));
                const salesId = saleRef.id;

                const branchId = activeBranchId || user?.branch_id || 'default_branch';

                // 1. COLLECT ALL READS FIRST
                const productRefs = items.map(item => doc(db, 'products', item.producto.id));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                // Filtrar items con variantes para leer sus documentos
                const variantItems = items.filter(item => item.variante?.id);
                const variantRefs = variantItems.map(item => doc(db, 'product_variants', item.variante!.id));
                const variantDocs = variantRefs.length > 0
                    ? await Promise.all(variantRefs.map(ref => transaction.get(ref)))
                    : [];

                let customerDoc = null;
                if (customerId) {
                    const customerRef = doc(db, 'customers', customerId);
                    customerDoc = await transaction.get(customerRef);
                }

                // 2. CALCULATE AND PREPARE WRITES
                const updates: (() => void)[] = [];

                // Actualización de stock del producto padre
                items.forEach((item, index) => {
                    const productDoc = productDocs[index];
                    if (!productDoc.exists()) throw new Error(`Producto ${item.producto.nombre} no encontrado`);

                    const currentStock = productDoc.data().stock_actual || 0;
                    const reduction = item.cantidad || 1;

                    updates.push(() => transaction.update(productRefs[index], {
                        stock_actual: currentStock - reduction,
                        updated_at: Timestamp.now()
                    }));
                });

                // Actualización de stock por variante y sucursal
                variantItems.forEach((item, index) => {
                    const varDoc = variantDocs[index];
                    if (varDoc && varDoc.exists()) {
                        const currentVarStock = varDoc.data().stock_actual || 0;
                        const varBranchStockMap = varDoc.data().stock_by_branch || {};
                        const currentBranchStock = varBranchStockMap[branchId] || 0;
                        const reduction = item.cantidad || 1;

                        varBranchStockMap[branchId] = currentBranchStock - reduction;

                        updates.push(() => transaction.update(varDoc.ref, {
                            stock_actual: currentVarStock - reduction,
                            stock_by_branch: varBranchStockMap,
                            updated_at: Timestamp.now()
                        }));
                    }
                });

                // Creación de movimientos de stock para auditoría
                items.forEach(item => {
                    const movementRef = doc(collection(db, 'stock_movements'));
                    const reduction = item.cantidad || 1;
                    const movementRecord = {
                        tenantId: tenantId!,
                        tipo: 'venta',
                        producto_id: item.producto.id,
                        variante_id: item.variante?.id || null,
                        producto_nombre: item.producto.nombre,
                        talle: item.variante?.talle || item.producto.talle || null,
                        color: item.variante?.color || item.producto.color || null,
                        branch_origen: branchId,
                        cantidad: -reduction,
                        referencia_id: salesId,
                        usuario_id: user?.id || 'unknown',
                        fecha: Timestamp.now(),
                        nota: `Venta POS #${salesId.substring(0, 6)}`
                    };
                    updates.push(() => transaction.set(movementRef, cleanUndefined(movementRecord)));
                });

                // Actualización de Cuenta Corriente del Cliente
                if (paymentMethod === 'cuenta_corriente' && customerDoc?.exists()) {
                    const currentSaldo = customerDoc.data().saldo_cuenta_corriente || 0;
                    updates.push(() => transaction.update(customerDoc!.ref, {
                        saldo_cuenta_corriente: currentSaldo - totalVenta,
                        updated_at: Timestamp.now()
                    }));
                }

                // 3. EXECUTE ALL WRITES
                // Ejecutar todas las escrituras acumuladas (Corrigiendo bug crítico del POS)
                updates.forEach(fn => fn());

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
                            total: totalVenta,
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
                        throw new Error('AFIP: ' + afipError.message);
                    }

                    const { base, ivaAmount } = calculateIVADetails(totalVenta, 21);
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
                        total: totalVenta,
                        cae: caeData.cae,
                        vencimiento_cae: Timestamp.fromDate(caeData.vencimiento)
                    };
                }

                // 4. Create Sale Record
                const saleRecord: Sale = {
                    id: salesId,
                    tenantId: tenantId!,
                    branch_id: branchId || undefined,
                    items: [...items],
                    total: totalVenta,
                    metodo_pago: paymentMethod,
                    tipo_comprobante: invoiceType,
                    cliente_id: customerId || null as any,
                    usuario_id: user?.id || 'unknown',
                    fecha: Timestamp.now(),
                    cae: caeData.cae || null as any,
                    vencimiento_cae: caeData.cae ? Timestamp.fromDate(caeData.vencimiento) : null as any,
                    numero_comprobante: invoiceNumber ? `${businessData.puntoVenta.toString().padStart(4, '0')}-${invoiceNumber.toString().padStart(8, '0')}` : null as any
                };

                transaction.set(saleRef, cleanUndefined(saleRecord));
                setLastSaleData({ sale: saleRecord, invoice: invoiceData });
            });

            clearCart();
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

    const retiroCount = pendingOrders.filter(o => o.tipo_entrega === 'retiro_tienda' && o.estado !== 'retirado' && o.estado !== 'cancelado').length;

    return (
        <div className="min-h-screen bg-background p-4">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-primary">{businessData.nombre}</h1>
                    <p className="text-muted-foreground">Punto de Venta · Indumentaria</p>
                </div>

                <div className="flex items-center gap-2">
                    {retiroCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPickupOpen(!isPickupOpen)}
                            className="relative border-green-500/30 text-green-500 hover:bg-green-500/10"
                        >
                            <Store className="w-4 h-4 mr-2" />
                            Retiro
                            <Badge className="ml-1 h-4 min-w-4 text-[9px] bg-green-500 text-white">
                                {retiroCount}
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-160px)] overflow-hidden">
                {/* Lado Izquierdo: Catálogo de Productos */}
                <div className="lg:col-span-3 h-full flex flex-col overflow-hidden">
                    <Card className="h-full border-border bg-card flex flex-col overflow-hidden">
                        <CardContent className="p-4 h-full flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between mb-4 gap-4 flex-shrink-0">
                                <h3 className="text-sm font-bold text-primary uppercase flex items-center gap-2">
                                    <Package className="w-4 h-4" /> Productos
                                </h3>
                                <div className="relative flex-1 max-w-xs">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nombre, marca, categoría..."
                                        className="pl-9 h-9 bg-background border-border focus:border-primary"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-1">
                                <QuickAccessGrid
                                    products={searchTerm
                                        ? products.filter(p =>
                                            p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (p.marca || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            p.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
                                        : products
                                    }
                                    onProductClick={handleProductClick}
                                    quickAccessIds={searchTerm ? undefined : config?.branding?.quickAccessIds}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Lado Derecho: Carrito y Acciones de Facturación (Unificado) */}
                <div className="lg:col-span-1 h-full flex flex-col gap-4 overflow-hidden">
                    {/* Carrito de Compras (Scroll Interno) */}
                    <div className="flex-1 overflow-hidden">
                        <ShoppingCart />
                    </div>

                    {/* Resumen de Total y Acciones del POS */}
                    <div className="bg-card border border-border rounded-2xl p-4 flex-shrink-0 space-y-3.5 shadow-sm">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Líneas en carrito:</span>
                                <span className="font-bold text-foreground">{items.length}</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-2 border-t border-border/60">
                                <span className="text-xs uppercase font-black text-muted-foreground/80 tracking-wider">TOTAL A PAGAR:</span>
                                <span className="text-2xl font-black text-primary">{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full text-lg h-14 shadow-lg hover:shadow-xl transition-all duration-200 font-bold flex items-center justify-center gap-2 rounded-xl"
                            onClick={handleMainAction}
                            disabled={items.length === 0 || loading}
                        >
                            <DollarSign className="w-5 h-5" />
                            Cobrar (F8)
                        </Button>

                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={items.length === 0}
                                onClick={clearCart}
                                className="border-border hover:bg-destructive/10 hover:text-destructive text-xs h-9 font-semibold rounded-xl"
                            >
                                Limpiar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsRegisterCloseOpen(true)}
                                className="border-border hover:bg-accent text-xs h-9 font-semibold rounded-xl"
                            >
                                Cerrar Caja
                            </Button>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsReturnOpen(true)}
                            className="w-full border-border hover:bg-accent text-[11px] h-8 font-semibold rounded-xl"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Devoluciones (BORIS)
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <VariantSelectorDialog
                isOpen={isVariantSelectorOpen}
                onClose={() => setIsVariantSelectorOpen(false)}
                product={selectedProductForVariant}
                onSelect={handleVariantSelected}
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

            <RegisterOpenDialog
                isOpen={isRegisterOpenDialogOpen}
                onOpenSuccess={() => setIsRegisterOpenDialogOpen(false)}
            />

            <UIDialog open={isPickupOpen} onOpenChange={setIsPickupOpen}>
                <UIDialogContent className="sm:max-w-[600px] bg-card border-border">
                    <UIDialogHeader>
                        <UIDialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Store className="w-5 h-5 text-primary" />
                            Pedidos para Retirar en Tienda
                        </UIDialogTitle>
                        <UIDialogDescription>
                            Gestioná los pedidos BOPIS que los clientes vienen a retirar.
                        </UIDialogDescription>
                    </UIDialogHeader>
                    <PickupPanel orders={pendingOrders} />
                </UIDialogContent>
            </UIDialog>

            <ReturnDialog
                isOpen={isReturnOpen}
                onClose={() => setIsReturnOpen(false)}
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
