import { Timestamp } from 'firebase/firestore';

// ============================================
// PRODUCT TYPES
// ============================================

export interface Product {
    id: string;
    tenantId: string; // ID for SaaS multi-tenancy
    nombre: string;
    descripcion_corta?: string;
    codigo_barras: string;
    categoria: string;
    // Retail Fields
    marca?: string;
    talle?: string;
    color?: string;
    material?: string;

    precio_costo?: number;
    precio_venta: number;
    precio_oferta?: number;
    stock_actual?: number;
    stock_minimo: number;
    stock_controlado: boolean;
    es_pesable: boolean; // true for items sold by weight (kg)
    unidad: 'kg' | 'unidad' | 'litro';
    proveedor_id?: string;
    imagen_url?: string;
    galeria_imagenes?: string[];
    activo: boolean;
    disponible: boolean;
    es_destacado?: boolean;
    orden_catalogo?: number;
    // Gastronomy extensions (Deprecated for Retail)
    tiempo_preparacion_minutos?: number;
    ingredientes?: string;
    alergenos?: string[];
    apto_vegetariano?: boolean;
    apto_vegano?: boolean;
    sin_tacc?: boolean;
    tamanio_porcion?: string;

    tiene_variantes?: boolean;
    variantes?: ProductVariant[];
    extras?: ProductExtra[];
    es_combo?: boolean;
    productos_incluidos?: string[]; // IDs of products in combo
    slug?: string;
    tipo: 'producto' | 'materia_prima';
    receta?: RecipeIngredient[]; // Recipe/formula for production cost calculation
    costo_produccion_calculado?: number; // Auto-calculated from recipe
    created_at: Timestamp;
    updated_at: Timestamp;
}

export interface ProductVariant {
    nombre: string; // Ej: "Tamaño", "Sabor"
    opciones: VariantOption[];
}

export interface VariantOption {
    nombre: string; // Ej: "Chico", "Grande"
    precio_extra: number;
}

export interface ProductExtra {
    nombre: string; // Ej: "Cheddar", "Bacon"
    precio: number;
    max_seleccionables?: number;
}

export interface RecipeIngredient {
    materia_prima_id: string; // Reference to raw material Product
    materia_prima_nombre: string; // Cached name for display
    cantidad: number; // Amount needed (in the raw material's unit)
    unidad: 'kg' | 'unidad' | 'litro'; // Cached unit
}

// ============================================
// CART & SALES TYPES
// ============================================

export interface CartItem {
    internalId?: string; // Unique ID for cart management (handles same product with different options)
    producto: Product;
    cantidad: number; // For non-weighable items
    peso_gramos?: number; // For weighable items
    subtotal: number;
    // Gastronomy extensions
    selectedVariants?: { [key: string]: VariantOption }; // e.g. { "Tamaño": { nombre: "Grande", precio_extra: 100 } }
    selectedExtras?: ProductExtra[];
    notas?: string;
}

export type PaymentMethod = 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia' | 'cuenta_corriente' | 'mercado_pago';

export type InvoiceType = 'factura_a' | 'factura_b' | 'ticket';

export interface Sale {
    id: string;
    tenantId: string;
    items: CartItem[];
    total: number;
    metodo_pago: PaymentMethod;
    tipo_comprobante: InvoiceType;
    cliente_id?: string; // Required for cuenta_corriente
    usuario_id: string; // Cashier who made the sale
    fecha: Timestamp;
    numero_comprobante?: string;
    cae?: string; // AFIP authorization code
    vencimiento_cae?: Timestamp;
}

// ============================================
// CUSTOMER TYPES
// ============================================

export interface Customer {
    id: string;
    tenantId: string;
    nombre: string;
    dni_cuit?: string;
    telefono?: string;
    direccion?: string;
    email?: string;
    saldo_cuenta_corriente: number; // Negative = owes money
    limite_credito: number;
    activo: boolean;
    created_at: Timestamp;
    updated_at: Timestamp;
}

export interface Payment {
    id: string;
    cliente_id: string;
    monto: number;
    metodo_pago: PaymentMethod;
    fecha: Timestamp;
    usuario_id: string;
    nota?: string;
}

// ============================================
// INVOICE TYPES (FISCAL)
// ============================================

export interface Invoice {
    id: string;
    tipo: InvoiceType;
    numero: number;
    punto_venta: number;
    fecha: Timestamp;
    cliente_nombre: string;
    cliente_cuit?: string; // Required for Factura A
    items: CartItem[];
    subtotal: number;
    iva_21: number;
    iva_105: number;
    total: number;
    cae?: string;
    vencimiento_cae?: Timestamp;
    qr_data?: string;
}

// ============================================
// SUPPLIER TYPES
// ============================================

export interface Supplier {
    id: string;
    tenantId: string;
    nombre: string;
    cuit?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    activo: boolean;
    created_at: Timestamp;
    updated_at: Timestamp;
}

export interface PurchaseInvoice {
    id: string;
    proveedor_id: string;
    numero_factura: string;
    fecha: Timestamp;
    items: {
        producto_id: string;
        cantidad: number;
        precio_unitario: number;
        subtotal: number;
    }[];
    total: number;
    created_at: Timestamp;
}

// ============================================
// CASH REGISTER TYPES
// ============================================

export interface CashRegister {
    id: string;
    tenantId: string;
    fecha_apertura: Timestamp;
    fecha_cierre?: Timestamp;
    usuario_id: string;
    cajero_nombre: string;
    monto_inicial: number;
    ventas_efectivo: number;
    ventas_tarjeta_debito: number;
    ventas_tarjeta_credito: number;
    ventas_transferencia: number;
    ventas_cuenta_corriente: number;
    total_ventas: number;
    efectivo_contado?: number; // Manual count
    diferencia?: number;
    cerrada: boolean;
    notas?: string;
}

// ============================================
// USER & AUTH TYPES
// ============================================

export interface User {
    id: string;
    tenantId: string;
    email: string;
    nombre: string;
    rol: 'admin' | 'cajero' | 'superadmin';
    activo: boolean;
    created_at: Timestamp;
    storeName?: string; // Optional: friendly name of the store
}

// Granular Permissions System
export type Permission =
    | 'ventas.crear'
    | 'ventas.ver'
    | 'ventas.anular'
    | 'productos.crear'
    | 'productos.editar'
    | 'productos.eliminar'
    | 'productos.ver'
    | 'clientes.crear'
    | 'clientes.editar'
    | 'clientes.ver'
    | 'proveedores.crear'
    | 'proveedores.editar'
    | 'proveedores.ver'
    | 'compras.crear'
    | 'compras.ver'
    | 'reportes.ver'
    | 'reportes.exportar'
    | 'caja.abrir'
    | 'caja.cerrar'
    | 'configuracion.ver'
    | 'configuracion.editar'
    | 'usuarios.crear'
    | 'usuarios.editar'
    | 'recetas.configurar';

export interface Role {
    id: string;
    tenantId: string;
    nombre: string;
    descripcion?: string;
    permisos: Permission[];
    es_sistema: boolean; // true for predefined roles (admin, cashier)
    created_at: Timestamp;
    updated_at: Timestamp;
}

export interface StoreModules {
    afip_fiscal: boolean;
    delivery: boolean;
    waiter: boolean;
    integrated_pos: boolean;
}

export interface StoreConfig {
    id: string; // Same as tenantId
    nombre: string;
    razonSocial?: string;
    cuit?: string;
    rubro?: string;
    direccion?: string;
    telefono?: string;
    whatsapp?: string;
    alias?: string;
    cbu?: string;
    active: boolean;
    mercadoPago?: {
        accessToken: string;
        publicKey: string;
    };
    afip?: {
        cuit: string;
        punto_venta: number;
        certificado_vencimiento?: Timestamp;
    };
    branding?: {
        primaryColor?: string;
        secondaryColor?: string;
        logoUrl?: string;
        themeMode?: 'light' | 'dark';
        themeId?: 'clean-enterprise' | 'fresh-retail' | 'modern-slate';
        fontFamily?: string;
        quickAccessIds?: string[]; // IDs of products to show in POS quick access grid
    };
    social?: {
        instagram?: string;
        facebook?: string;
        twitter?: string;
    };
    modules?: StoreModules;
    created_at: Timestamp;
    updated_at: Timestamp;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface SalesAnalytics {
    fecha: string;
    total: number;
    cantidad_ventas: number;
}

export interface TopProduct {
    producto: Product;
    cantidad_vendida: number;
    total_revenue: number;
}

// ============================================
// EAN-13 PARSER TYPES
// ============================================

export interface ScaleBarcodeData {
    isScaleCode: boolean;
    productId?: string;
    weight?: number; // in grams
    price?: number; // if encoded as price instead of weight
}

// ============================================
// GASTROMONY / RESTAURANT TYPES
// ============================================

export type OrderType = 'salon' | 'mostrador' | 'delivery';

export type OrderStatus =
    | 'pending_kitchen'   // Order sent to kitchen
    | 'cooking'           // Chef started preparing
    | 'ready'             // Ready for pickup or delivery
    | 'delivering'        // Driver is on the way
    | 'completed'         // Delivered/Picked up and Paid
    | 'cancelled';        // Order cancelled

export interface Order {
    id: string;
    tenantId: string;
    type: OrderType;
    status: OrderStatus;
    items: CartItem[];
    total: number;
    cliente_id?: string | null;
    cliente_nombre?: string | null;
    cliente_telefono?: string | null;
    direccion_entrega?: string;
    mesa?: string; // For 'salon' type
    table_id?: string; // Direct reference to the table document
    repartidor_id?: string;
    repartidor_nombre?: string;
    usuario_id: string; // Waiter/Cashier who created it
    pagado: boolean;
    metodo_pago?: PaymentMethod;
    fecha: Timestamp;
    updated_at: Timestamp;
    notas?: string;
}

export interface OnlineOrderItem {
    producto: Product;
    cantidad: number;
    subtotal: number;
    selectedVariants?: { [key: string]: any };
    selectedExtras?: any[];
    notas?: string;
}

export interface OnlineOrder {
    id: string;
    tenantId: string;
    cliente_nombre: string;
    cliente_telefono: string;
    items: OnlineOrderItem[];
    total: number;
    estado: 'pendiente' | 'preparado' | 'cancelado' | 'finalizado'; // Keeping existing for now or migrate later
    mensaje_whatsapp?: string;
    metodo_pago?: 'transfer' | 'mercadopago';
    comprobante_url?: string;
    pago_confirmado?: boolean;
    pago_id?: string;
    mesa?: string;
    table_id?: string;
    fecha: Timestamp;
}

// ============================================
// RETURNS TO SUPPLIERS (Expired goods, etc)
// ============================================

export type ReturnStatus = 'pendiente' | 'enviado' | 'acreditado' | 'rechazado';

export interface MerchandiseReturn {
    id: string;
    proveedor_id: string;
    fecha: Timestamp;
    items: {
        producto_id: string;
        nombre: string; // Denormalized for history
        cantidad: number;
        unidad: string;
        precio_costo: number; // Cost at moment of return
        subtotal: number;
        motivo: string;
    }[];
    total: number;
    estado: ReturnStatus;
    nota?: string;
    usuario_id: string; // Who recorded the return
    created_at: Timestamp;
    updated_at: Timestamp;
}

// ============================================
// WAITER/TABLE MANAGEMENT TYPES
// ============================================

export type TableStatus = 'libre' | 'ocupada' | 'pendiente_cobro';

export interface Table {
    id: string;
    tenantId: string;
    numero: number; // Table number
    estado: TableStatus;
    capacidad: number; // Seats
    order_id?: string; // Active order reference
    mozo_asignado?: string; // User ID of assigned waiter
    cliente_nombre?: string;
    hora_ocupacion?: Timestamp;
    created_at: Timestamp;
    updated_at: Timestamp;
}

// ============================================
// DELIVERY / LOGISTICS TYPES
// ============================================

export interface DeliveryDriver {
    id: string;
    tenantId: string;
    nombre: string;
    telefono: string;
    vehiculo: 'moto' | 'auto' | 'bicicleta' | 'otro';
    patente?: string;
    activo: boolean; // Present today?
    created_at: Timestamp;
    updated_at: Timestamp;
}

// ============================================
// AFIP / FISCAL TYPES
// ============================================

export interface AfipCertificate {
    id: string; // Document ID (same as tenantId for easy lookup)
    tenantId: string;
    cuit: string; // CUIT del contribuyente
    certificado: string; // Contenido del archivo .crt (PEM format)
    clave_privada: string; // Contenido del archivo .key (PEM format)
    punto_venta: number; // Punto de venta configurado
    production: boolean; // false = homologación, true = producción
    fecha_vencimiento?: Timestamp; // Vencimiento del certificado
    activo: boolean;
    created_at: Timestamp;
    updated_at: Timestamp;
}
