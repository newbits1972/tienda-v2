import type { Timestamp } from 'firebase/firestore';

// ============================================
// PRODUCT TYPES (RETAIL / INDUMENTARIA)
// ============================================

export type Genero = 'hombre' | 'mujer' | 'unisex' | 'ninio' | 'ninia';

export interface ColorOption {
    nombre: string;   // "Negro", "Rojo"
    hex: string;      // "#000000" for visual swatches
}

export interface Product {
    id: string;
    tenantId: string; // ID for SaaS multi-tenancy
    nombre: string;
    descripcion_corta?: string;
    codigo_barras: string;          // Código del producto padre (referencia)
    categoria: string;

    // Retail Fields
    marca?: string;
    material?: string;
    genero?: Genero;
    temporada?: string;             // Ej: "Verano 26", "Invierno 26"
    coleccion?: string;             // Línea/categoría comercial
    talle?: string;
    color?: string;

    // Pricing
    precio_costo?: number;          // Último costo en ARS
    precio_costo_usd?: number;      // Costo en USD (moneda dual)
    precio_venta: number;           // Precio default (las variantes pueden override)
    precio_oferta?: number;

    // Stock agregado (solo lectura = suma de variantes)
    stock_actual?: number;
    stock_minimo: number;
    stock_controlado: boolean;

    // Matriz talle×color (definición a nivel producto)
    talles_disponibles?: string[];     // ["S","M","L","XL"]
    colores_disponibles?: ColorOption[];
    curva_default?: number[];          // Carga rápida, ej: [1,2,2,2,1]

    proveedor_id?: string;
    imagen_url?: string;
    galeria_imagenes?: string[];
    es_destacado?: boolean;
    activo: boolean;
    disponible: boolean;
    tipo?: string;                     // "producto" | "materia_prima"
    tiene_variantes?: boolean;
    slug?: string;
    unidad?: 'kg' | 'unidad';
    es_pesable?: boolean;
    variantes?: any[];
    extras?: ProductExtra[];
    created_at: Timestamp;
    updated_at: Timestamp;
}

/**
 * Variante de producto = combinación talle×color con SKU y stock propios.
 * Es la unidad atómica del inventario en indumentaria.
 */
export interface ProductVariant {
    id: string;
    tenantId: string;
    producto_id: string;            // FK al Product padre
    producto_nombre?: string;       // Cache para listados
    talle: string;                  // "S", "M", "L", "38", "40"
    color: string;                  // "Negro", "Rojo"
    color_hex?: string;             // "#000000"
    sku: string;                    // "REM-BS-NEG-M" — ÚNICO por tenant
    codigo_barras: string;          // EAN-13 ÚNICO por combinación

    // Stock total (suma de stock_by_branch)
    stock_actual: number;
    stock_minimo: number;

    // Stock por sucursal (multi-branch)
    stock_by_branch?: { [branchId: string]: number };

    precio_venta?: number;          // Override opcional del padre
    imagen_url?: string;            // Foto de ESTE color
    activo: boolean;
    created_at: Timestamp;
    updated_at: Timestamp;
}

export interface ProductExtra {
    nombre: string;
    precio: number;
}

// ============================================
// CART & SALES TYPES
// ============================================

export interface CartItem {
    internalId?: string;            // Unique ID for cart management
    producto: Product;
    variante?: ProductVariant;      // Combinación talle×color específica
    variante_id?: string;           // FK para persistencia
    cantidad: number;
    subtotal: number;
}

export type PaymentMethod = 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia' | 'cuenta_corriente' | 'mercado_pago';

export type InvoiceType = 'factura_a' | 'factura_b' | 'ticket';

export interface Sale {
    id: string;
    tenantId: string;
    branch_id?: string;             // Sucursal donde se realizó la venta
    items: CartItem[];
    total: number;
    metodo_pago: PaymentMethod;
    tipo_comprobante: InvoiceType;
    cliente_id?: string;            // Required for cuenta_corriente
    usuario_id: string;             // Cashier who made the sale
    fecha: Timestamp;
    numero_comprobante?: string;
    cae?: string;                   // AFIP authorization code
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
    cliente_cuit?: string;          // Required for Factura A
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
    pais?: string;                  // Proveedor extranjero (USA, China, etc.)
    lead_time_dias?: number;        // Tiempo de entrega estimado
    activo: boolean;
    created_at: Timestamp;
    updated_at: Timestamp;
}

export interface PurchaseInvoice {
    id: string;
    proveedor_id: string;
    numero_factura: string;
    moneda: 'ARS' | 'USD';
    tipo_cambio?: number;           // TC al momento de la compra (si moneda=USD)
    fecha: Timestamp;
    items: {
        producto_id: string;
        cantidad: number;
        precio_unitario: number;    // En moneda de la factura
        subtotal: number;
    }[];
    total: number;
    total_ars?: number;             // Convertido al TC
    created_at: Timestamp;
}

// ============================================
// BRANCH (MULTI-SUCURSAL) TYPES
// ============================================

export interface Branch {
    id: string;
    tenantId: string;
    nombre: string;                 // "Local Centro", "Sucursal Nordelta"
    direccion?: string;
    telefono?: string;
    es_casa_central: boolean;       // Sede principal (destino default de compras)
    activa: boolean;
    created_at: Timestamp;
    updated_at: Timestamp;
}

// ============================================
// STOCK MOVEMENTS (AUDIT TRAIL)
// ============================================

export type StockMovementType = 'compra' | 'venta' | 'transferencia' | 'ajuste' | 'devolucion';

export interface StockMovement {
    id: string;
    tenantId: string;
    tipo: StockMovementType;
    variante_id: string;
    producto_id: string;
    producto_nombre?: string;
    talle?: string;
    color?: string;
    branch_origen?: string;         // Para ventas/compras = branch donde ocurre
    branch_destino?: string;        // Para transferencias
    cantidad: number;               // Positivo = entra, negativo = sale
    referencia_id?: string;         // sale_id / purchase_id / transfer_id
    usuario_id: string;
    fecha: Timestamp;
    nota?: string;
}

// ============================================
// TRANSFERENCIAS ENTRE SUCURSALES
// ============================================

export type TransferStatus = 'pendiente' | 'en_transito' | 'recibida' | 'cancelada';

export interface TransferItem {
    variante_id: string;
    producto_nombre: string;
    talle: string;
    color: string;
    cantidad: number;
}

export interface Transfer {
    id: string;
    tenantId: string;
    branch_origen: string;
    branch_destino: string;
    items: TransferItem[];
    estado: TransferStatus;
    remito_numero?: string;
    usuario_origen_id: string;
    usuario_destino_id?: string;
    fecha: Timestamp;
    fecha_envio?: Timestamp;
    fecha_recepcion?: Timestamp;
    nota?: string;
}

// ============================================
// CASH REGISTER TYPES
// ============================================

export interface CashRegister {
    id: string;
    tenantId: string;
    branch_id?: string;             // Sucursal de la caja
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
    efectivo_contado?: number;      // Manual count
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
    branch_id?: string;             // Sucursal asignada (multi-branch)
    activo: boolean;
    created_at: Timestamp;
    storeName?: string;
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
    | 'variantes.editar'
    | 'clientes.crear'
    | 'clientes.editar'
    | 'clientes.ver'
    | 'proveedores.crear'
    | 'proveedores.editar'
    | 'proveedores.ver'
    | 'compras.crear'
    | 'compras.ver'
    | 'transferencias.crear'
    | 'transferencias.recibir'
    | 'transferencias.ver'
    | 'reportes.ver'
    | 'reportes.exportar'
    | 'caja.abrir'
    | 'caja.cerrar'
    | 'configuracion.ver'
    | 'configuracion.editar'
    | 'usuarios.crear'
    | 'usuarios.editar';

export interface Role {
    id: string;
    tenantId: string;
    nombre: string;
    descripcion?: string;
    permisos: Permission[];
    es_sistema: boolean;            // true for predefined roles (admin, cashier)
    created_at: Timestamp;
    updated_at: Timestamp;
}

export interface StoreModules {
    afip_fiscal: boolean;
    integrated_pos: boolean;
    multi_branch: boolean;          // Multi-sucursal activo
    ecommerce: boolean;             // Catálogo online propio
}

export interface StoreConfig {
    id: string;                     // Same as tenantId
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
        quickAccessIds?: string[];
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
// E-COMMERCE / ONLINE ORDERS
// ============================================

export interface OnlineOrderItem {
    producto: Product;
    variante?: ProductVariant;
    cantidad: number;
    subtotal: number;
}

export type FulfillmentType = 'retiro_tienda' | 'envio_domicilio';

export type OnlineOrderStatus = 'pendiente' | 'preparado' | 'cancelado' | 'finalizado' | 'pendiente_retiro' | 'listo_para_retirar' | 'retirado';

export interface OnlineOrder {
    id: string;
    tenantId: string;
    cliente_nombre: string;
    cliente_telefono: string;
    items: OnlineOrderItem[];
    total: number;
    estado: OnlineOrderStatus;
    tipo_entrega: FulfillmentType;
    branch_retiro_id?: string;      // Sucursal donde retira (BOPIS cross-store)
    direccion_entrega?: string;
    mensaje_whatsapp?: string;
    metodo_pago?: 'transfer' | 'mercadopago' | 'astropay';
    comprobante_url?: string;
    pago_confirmado?: boolean;
    pago_id?: string;
    fecha: Timestamp;
}

// ============================================
// RETURNS (BORIS - Buy Online, Return In Store)
// ============================================

export type ReturnReason = 'producto_defectuoso' | 'producto_incorrecto' | 'cambio_de_opinion' | 'talle_incorrecto' | 'otro';

export interface ReturnItem {
    producto_id: string;
    producto_nombre: string;
    variante_id?: string;
    talle?: string;
    color?: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    motivo: ReturnReason;
    descripcion?: string;
}

export interface StoreReturn {
    id: string;
    tenantId: string;
    tipo_origen: 'online_order' | 'in_store_sale';
    orden_original_id: string;
    cliente_nombre: string;
    cliente_telefono?: string;
    items: ReturnItem[];
    subtotal: number;
    total: number;
    metodo_reembolso: 'efectivo' | 'mismo_metodo' | 'credito_tienda';
    estado: 'pendiente' | 'aprobado' | 'rechazado';
    usuario_id: string;
    fecha: Timestamp;
    notas?: string;
}

// ============================================
// RETURNS TO SUPPLIERS
// ============================================

export type ReturnStatus = 'pendiente' | 'enviado' | 'acreditado' | 'rechazado';

export interface MerchandiseReturn {
    id: string;
    proveedor_id: string;
    fecha: Timestamp;
    items: {
        producto_id: string;
        variante_id?: string;
        nombre: string;
        cantidad: number;
        precio_costo: number;
        subtotal: number;
        motivo: string;
    }[];
    total: number;
    estado: ReturnStatus;
    nota?: string;
    usuario_id: string;
    created_at: Timestamp;
    updated_at: Timestamp;
}

// ============================================
// AFIP / FISCAL TYPES
// ============================================

export interface AfipCertificate {
    id: string;                     // Document ID (same as tenantId)
    tenantId: string;
    cuit: string;
    certificado: string;            // PEM content
    clave_privada: string;          // PEM content
    punto_venta: number;
    production: boolean;            // false = homologación
    fecha_vencimiento?: Timestamp;
    activo: boolean;
    created_at: Timestamp;
    updated_at: Timestamp;
}
