# DataSense Retail - Gestión de Indumentaria y Comercio Minorista SaaS

Sistema integral de punto de venta (POS) y gestión empresarial multi-sucursal y multi-inquilino para comercios de retail en Argentina.

## 🚀 Características Principales

- **POS (Punto de Venta) Especializado** con soporte para escáneres de códigos de barra y Mercado Pago.
- **Matriz de Talles y Colores**: Gestión atómica de stock y precios por variantes de tamaño y color.
- **Facturación AFIP** integrada (Facturas A/B/C, Ticket con CAE y QR legal).
- **Catálogo Online Público** con retiro en tienda (**BOPIS**) y envío a domicilio.
- **Devoluciones unificadas (BORIS)**: Devoluciones cruzadas y cambios integrados en local físico para pedidos web y compras físicas.
- **Multi-Sucursal e Inventario**: Transferencias internas de mercadería con control de "Stock en Tránsito" entre sucursales y depósitos.
- **Cuentas Corrientes**: Gestión de crédito a clientes con límite parametrizado y registro de cobros.
- **Etiquetas**: Impresión de códigos de barra por variante para percheros.
- **Analytics** y reportes avanzados de ventas, ticket promedio y ranking de prendas más vendidas.

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS 4 + shadcn/ui + Radix UI
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Estado**: Zustand
- **UI**: Framer Motion, Recharts, Lucide Icons

## 📦 Instalación

```bash
npm install
```

Crear archivo `.env.local` con credenciales de Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

Iniciar servidor de desarrollo:

```bash
npm run dev
```

## ⌨️ Atajos de Teclado (POS)

- **F1**: Ayuda (Atajos de teclado)
- **F2**: Cierre de Caja (Arqueo)
- **F8**: Cobrar / Ir a Checkout
- **ESC**: Cancelar diálogo

## 📱 Módulos

### POS (Punto de Venta)
- Escaneo rápido de códigos de barras (SKU / EAN-13).
- Selector dinámico de variantes (Talle y Color) mediante modal interactivo.
- Múltiples métodos de pago (efectivo, tarjetas, transferencias, Mercado Pago Point/QR, cuenta corriente).
- Integración AFIP para generación de comprobantes con CAE en tiempo real.

### Tienda Online & Omnicanalidad
- Tienda pública autogenerada para cada comercio (`/catalogo/[tenantId]`).
- **BOPIS**: Compra online y retiro físico en la sucursal seleccionada.
- **BORIS**: Devolución unificada de pedidos online en tienda física con reingreso automático al stock de la sucursal.

### Inventario Multi-Sucursal
- Maestro de productos con variantes dinámicas.
- Transferencias documentadas de stock entre sucursales (`/transferencias`).
- Actualización masiva de precios por categorías o proveedores.
- Carga de stock y control de stock mínimo con alertas críticas en el Dashboard.

### Tesorería y Caja
- Apertura y cierre de caja ciego para auditar diferencias de efectivo por cajero.

---

## 🏗️ Estructura del Proyecto

```
├── app/                  # Rutas de Next.js
│   ├── pos/              # Punto de venta (POS)
│   ├── catalogo/         # Catálogo público online por inquilino
│   ├── pickup/           # Módulo de retiros en tienda (BOPIS)
│   ├── customers/        # Panel de clientes y Cuenta Corriente
│   ├── productos/        # Gestión de inventario de productos (antes /carta)
│   ├── returns/          # Gestión de devoluciones (BORIS)
│   ├── transferencias/   # Transferencias de stock entre sucursales
│   └── sucursales/       # ABM de sucursales físicas
├── components/           # Componentes modulares
│   ├── pos/              # Componentes de caja y carrito
│   ├── sales/            # Devoluciones y cambios
│   ├── shop/             # Catálogo online
│   ├── fiscal/           # Ticketera y firma AFIP
│   └── ui/               # Base de componentes shadcn/ui
├── lib/                  # Utilidades y configuración
│   ├── firebase/         # Configuración y carga semilla (Seed)
│   ├── fiscal/           # WSAA/WSFE de AFIP
│   └── types/            # Tipos de TypeScript
```

## 📄 Licencia

Desarrollado para DataSense Retail - 2026
