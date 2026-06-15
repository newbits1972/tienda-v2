# DataSense Food - Gestión Gastronómica SaaS

Sistema integral de punto de venta y gestión empresarial para comercios en Argentina.

## 🚀 Características Principales

- **POS (Punto de Venta)** con soporte para productos pesables, escáner de código de barras y Mercado Pago
- **Facturación AFIP** integrada (Facturas A/B, Ticket con CAE)
- **Catálogo Online** con retiro en tienda (BOPIS) y envío a domicilio
- **Devoluciones unificadas (BORIS)** — online y tienda física
- **Parser EAN-13** para códigos de balanzas
- **Gestión de Inventario** con recetas, materias primas y actualización masiva de precios
- **Cuenta Corriente** para clientes
- **Delivery** — gestión de repartidores y pedidos
- **Mozo/Mesas** — gestión de pedidos por mesa
- **Multi-tenancy** — arquitectura SaaS multi-cliente
- **Analytics** y reportes de ventas
- **Sincronización en tiempo real** entre terminales

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS 4 + shadcn/ui + Radix UI
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
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

```bash
npm run dev
```

## ⌨️ Atajos de Teclado

- **F1**: Ayuda
- **F2**: Cierre de Caja
- **F8**: Cobrar
- **ESC**: Cancelar

## 📱 Módulos

### POS (Punto de Venta)
- Escaneo de códigos de barras (cámara + lector físico)
- Soporte para balanzas (EAN-13)
- Modal de pesaje con teclado numérico
- Múltiples métodos de pago (efectivo, tarjeta, transferencia, MP, cuenta corriente)
- Integración AFIP con generación de CAE

### Catálogo Online
- Tienda pública por tenant
- Carrito de compras con variantes y extras
- Pago con Mercado Pago, AstroPay o Transferencia Bancaria
- **BOPIS**: opción de retiro en tienda
- **BORIS**: devoluciones integradas

### Inventario
- CRUD de productos con variantes y combos
- Recetas y materias primas con cálculo de costo de producción
- Actualización masiva de precios
- Importación bulk desde CSV
- Alertas de stock bajo

### Clientes
- Cuenta corriente con límite de crédito
- Historial de compras
- Registro de pagos

### Delivery
- Gestión de repartidores
- Tracking de pedidos en tiempo real
- Contacto por WhatsApp

### Cocina (Kitchen Display)
- Visualización de pedidos entrantes
- Órdenes de comanda térmica

### Analytics
- Dashboard de ventas
- Top productos
- Cierre de caja por método de pago

## 🏗️ Estructura del Proyecto

```
├── app/
│   ├── pos/              # Punto de venta
│   ├── catalogo/         # Catálogo online público
│   ├── pickup/           # Gestión de retiro en tienda
│   ├── customers/        # Gestión de clientes
│   ├── delivery/         # Delivery y repartidores
│   ├── kitchen/          # Display de cocina
│   ├── returns/          # Devoluciones (proveedores + clientes)
│   ├── reports/          # Reportes
│   └── api/              # API Routes (MP, AFIP, AstroPay)
├── components/
│   ├── pos/              # Componentes del POS
│   ├── sales/            # Devoluciones BORIS
│   ├── shop/             # Catálogo online
│   ├── fiscal/           # Facturación AFIP
│   └── ui/               # shadcn/ui
├── lib/
│   ├── firebase/         # Configuración Firebase
│   ├── fiscal/           # Servicios AFIP
│   ├── payments/         # Mercado Pago
│   ├── types/            # TypeScript types
│   └── utils/            # Utilidades
├── hooks/                # React hooks
└── contexts/             # React contexts (Auth, Branding)
```

## 📄 Licencia

Desarrollado para DataSense Food - 2026
