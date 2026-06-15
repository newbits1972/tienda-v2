# PedidosIA / Fiambrería Pro - White Paper Técnico & Arquitectura SaaS

Este documento detalla la ingeniería detrás del ecosistema **PedidosIA**, proporcionando una visión profunda para integradores, CTOs y clientes corporativos sobre la robustez, escalabilidad y seguridad del sistema.

---

## 1. Visión Arquitectónica: SaaS Multi-Tenancy

El sistema está diseñado bajo un paradigma de **Software como Servicio (SaaS)** nativo, permitiendo la coexistencia de múltiples comercios independientes sobre una infraestructura común escalable.

### Capa de Aislamiento de Datos
Utilizamos una arquitectura de **Base de Datos Compartida con Esquema de Aislamiento por Documento**:
*   **Tenant Partitioning**: Cada registro (Producto, Venta, Cliente) es inyectado con un `tenantId` único mediante el Hook `useTenant`. 
*   **Data Sovereignty**: Las `Security Rules` de Firebase actúan como un cortafuegos a nivel de servidor (Kernel-level), impidiendo cross-tenant data leaks. Ninguna consulta puede retornar datos que no pertenezcan expresamente al usuario autenticado.

### Sincronización y Resiliencia (Offline-First Capability)
Mediante el uso de **Persistent Local Cache** y **Multiple Tab Manager** de Firestore, el sistema garantiza operatividad en condiciones de red inestables. Las transacciones se encolan localmente y se sincronizan atómicamente al recuperar la conexión, manteniendo la integridad referencial.

---

## 2. Ingeniería del Punto de Venta (POS)

El POS no es solo una interfaz de venta; es un motor de procesamiento de hardware en tiempo real.

### Algoritmo de Decodificación EAN-13 & Balanza
El sistema implementa un parser avanzado para periféricos de pesaje:
*   **Identificación Automática**: Detecta el prefijo "20" (Estándar Argentino para pesas).
*   **Transformación Dinámica**: Extrae el SKU (5 dígitos) y el Valor (5 dígitos). 
*   **Lógica Intelectual**: Dependiendo de la configuración del comercio, el valor se interpreta como **Peso (gramos)** o **Precio**. Si es precio, el sistema realiza una operación inversa basándose en el precio unitario del maestro de artículos para derivar el peso exacto para la facturación fiscal.

### Concurrencia y Transaccionalidad
Las operaciones de cierre de venta utilizan **Atomic Transactions**:
1.  **Lectura Crítica**: Verifica stock y número de comprobante.
2.  **Validación de Saldo**: En ventas a "Cuenta Corriente", valida el límite de crédito en el mismo milisegundo de la transacción.
3.  **Escritura Atómica**: Actualiza productos, genera el registro de venta y actualiza la caja en un solo commit de base de datos. Si un paso falla, el sistema realiza un Rollback completo.

---

## 3. Motor Fiscal: Integración AFIP (WSAA/WSFE)

La integración fiscal es el componente más sensible y robusto del sistema.

### Ciclo de Vida de Autorización (CMS Electronic Signature)
El servidor de API implementa un flujo de seguridad de 2 pasos:
1.  **WSAA (Authentication)**: Genera un pedido de ticket de acceso (TRA) firmado digitalmente mediante algoritmos RSA con los archivos `.key` y `.crt` específicos de cada comercio. 
2.  **WSAI (Invoicing)**: Una vez obtenida la sesión (Token/Sign), se comunica con el Web Service de Factura Electrónica (WSFE) para solicitar el CAE.

### Generación de Comprobantes Inteligentes
*   **Cálculo de IVA Proyectado**: Desglose automático de alícuotas (21%, 10.5%).
*   **QR Dinámico**: Generación de códigos QR bajo normativa AFIP (JSON serializado en Base64), permitiendo la validación inmediata del comprobante ante la entidad fiscal.

---

## 4. Ecosistema de Pagos Integrados

### Mercado Pago (Omnicanal)
Soporte nativo para tres flujos de cobro:
1.  **Point (Smart Terminals)**: Integración vía REST API para enviar el monto directamente a la lectora física, eliminando errores de carga manual por el cajero.
2.  **QR Dinámico**: Generación de intención de pago en pantalla que actualiza el estado de la venta automáticamente al confirmarse el cobro.
3.  **Checkout Web**: Pasarela segura para pedidos online con Webhooks para confirmación asincrónica.

---

## 5. Seguridad y Auditoría

*   **Identidad**: Firebase Auth con JWT (JSON Web Tokens) expira sesiones inactivas y protege endpoints sensibles.
*   **Control de Acceso (RBAC)**: Sistema de permisos granulares. Los roles (`Admin`, `Cajero`, `Mozo`) limitan la visibilidad de reportes financieros y capacidades de modificación de precios.
*   **Trazabilidad**: Cada venta registra el `userId` del operador, permitiendo auditorías de arqueo de caja cruzadas.

---

## 6. Operaciones de Hardware

El sistema es compatible con una amplia gama de hardware comercial:
*   **Impresoras Térmicas (ESC/POS)**: Mediante componentes de renderizado optimizados para papel continuo de 58mm/80mm.
*   **Escáneres Laser/CCD**: Soporte para entrada de datos en crudo (HID) con captura de foco persistente.
*   **KDS (Kitchen Display System)**: Interfaz táctil para producción con actualización de estados por WebSocket (Push Notifications).

---
*Este documento es propiedad técnica de PedidosIA. Prohibida su reproducción total o parcial sin autorización.*
