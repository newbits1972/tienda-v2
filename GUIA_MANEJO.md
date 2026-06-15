# Guía de Manejo del Sistema - PedidosIA / Fiambrería Pro

Esta guía detalla el funcionamiento operativo del sistema para los roles de Administrador y Cajero.

---

## 1. Gestión de Ventas (POS - Punto de Venta)

El módulo de ventas está diseñado para ser ágil y permite manejar diferentes tipos de atención (Mostrador, Salón, Delivery).

### Ciclo Diario de Caja
1.  **Apertura**: Al iniciar el día o turno, el sistema solicitará el **Monto Inicial** de efectivo.
2.  **Operación**: Todas las ventas impactan en tiempo real en la caja activa.
3.  **Cierre**: Se debe realizar el arqueo de caja (`F2`). El sistema mostrará lo que "debería" haber (teórico) y el cajero debe ingresar lo que realmente hay (físico).

### Cómo Realizar una Venta
- **Escaneo**: Use el lector de códigos de barras. Si es un producto de balanza (ej: fiambres), el sistema calculará automáticamente el peso basándose en el precio escaneado.
- **Búsqueda Manual**: Use la barra de búsqueda o la grilla de **Accesos Rápidos** para productos frecuentes.
- **Cobro (`F8`)**: Seleccione el método de pago:
    - **Efectivo**: Ingrese el monto recibido para calcular el vuelto.
    - **Mercado Pago**: Genera un flujo de pago integrado.
    - **Cuenta Corriente**: Permite anotar la deuda a un cliente registrado (requiere crédito disponible).

### Atención en Salón (Mesas)
1.  Seleccione **"Mesas"**. Las mesas en verde están libres, en rojo ocupadas.
2.  **Comandar**: Agregue los productos y presione **"Comandar"**. Esto envía el pedido a la cocina sin cobrarlo.
3.  **Cerrar Mesa**: Al finalizar, seleccione la mesa ocupada y presione **"Cobrar"** para emitir el ticket final.

---

## 2. Administración de Productos

Acceda desde el menú lateral a la sección de **Productos**.

### Cargar Nuevo Producto
- **Código de Barras**: Esencial para el uso del escáner en el POS.
- **Pesable**: Marque esta opción si el producto se vende por kilo (balanza).
- **Stock Controlado**: Si se activa, el sistema descontará unidades con cada venta y avisará cuando quede poco.
- **Categorías**: Organice sus productos (Fiambres, Lácteos, Almacén, etc.) para facilitar la búsqueda.

---

## 3. Clientes y Cuentas Corrientes

El sistema permite fidelizar clientes y manejar fiados de forma segura.

- **Alta de Cliente**: Ingrese Nombre, CUIT/DNI y un **Límite de Crédito**.
- **Cobro de Deuda**: Desde el módulo de Clientes, puede registrar pagos parciales de deudas acumuladas.
- **Factura A**: Para emitir Factura A, el cliente debe tener cargado un CUIT válido.

---

## 4. Reportes y Estadísticas

Para dueños de negocio (Admin), el sistema provee:
- **Ventas Mensuales**: Gráficos de evolución de recaudación.
- **Top de Productos**: Cuáles son los artículos que más margen o volumen de venta generan.
- **Reporte de IVA**: Resumen de débitos fiscales para presentar al contador.

---

## 5. Configuración Fiscal (AFIP)

Si el módulo de AFIP está activo:
- Asegúrese de que el **Punto de Venta** sea exclusivo para uso de Web Services.
- El sistema validará automáticamente los certificados. Si hay algún error, aparecerá una alerta roja en la sección de configuración.

---
*Manual de Usuario - Versión 1.0*
