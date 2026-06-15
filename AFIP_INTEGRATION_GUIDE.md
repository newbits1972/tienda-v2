# Guía de Integración AFIP en el POS

## Resumen
La infraestructura de AFIP está completa y funcionando. Solo falta conectarla al flujo de checkout del POS.

## Archivos Creados

- ✅ `lib/types/index.ts` - Tipo `AfipCertificate`
- ✅ `lib/fiscal/afipFirestore.ts` - Servicio para leer certificados de Firestore
- ✅ `app/api/afip/upload-certificate/route.ts` - API para subir certificados
- ✅ `app/api/afip/generate-invoice/route.ts` - API para generar CAE
- ✅ `app/settings/afip/page.tsx` - Panel de administración
- ✅ `lib/hooks/useAfipInvoice.ts` - Hook helper para integración

## Pasos para Integrar

### 1. Configurar Certificados (Usuario Final)
1. El usuario debe ir a `/settings/afip`
2. Subir sus archivos `.crt` y `.key` de AFIP
3. Configurar CUIT y Punto de Venta
4. Elegir modo testing o producción

### 2. Modificar el POS (Desarrollador)

Busca en `app/pos/page.tsx` la función que maneja el checkout final (donde se guarda la venta a Firestore).

**Antes del código existente, agrega:**

```typescript
import { useAfipInvoice } from '@/lib/hooks/useAfipInvoice';

// Dentro del componente:
const { generateAfipInvoice } = useAfipInvoice();
```

**Modifica la función de checkout:**

```typescript
const handleCheckout = async (paymentMethod, invoiceType, customerId) => {
    setLoading(true);
    
    try {
        // 1. SI ES FACTURA A O B, LLAMAR A AFIP
        let afipData = null;
        if (invoiceType === 'factura_a' || invoiceType === 'factura_b') {
            const customer = customers.find(c => c.id === customerId);
            
            const result = await generateAfipInvoice({
                tipo_comprobante: invoiceType,
                cliente_cuit: customer?.dni_cuit,
                cliente_nombre: customer?.nombre || 'Consumidor Final',
                total: cartTotal,
                fecha: new Date(),
                items: cart
            });

            if (!result.success) {
                // Abortar venta si AFIP falló
                setLoading(false);
                return;
            }

            afipData = {
                cae: result.cae,
                cae_vencimiento: result.cae_vencimiento,
                numero_comprobante: result.numero_comprobante,
                punto_venta: result.punto_venta
            };
        }

        // 2. GUARDAR VENTA CON CAE (tu código existente)
        const saleRef = await addDoc(collection(db, 'sales'), {
            tenantId,
            items: cart,
            total: cartTotal,
            metodo_pago: paymentMethod,
            tipo_comprobante: invoiceType,
            fecha: Timestamp.now(),
            ...afipData // ✨ Agregar datos de AFIP
        });

        toast.success(afipData?.cae 
            ? `Venta completada - CAE: ${afipData.cae}` 
            : 'Venta completada'
        );

        // 3. IMPRIMIR TICKET (tu código existente)
        
    } catch (error) {
        console.error(error);
        toast.error('Error al procesar venta');
    } finally {
        setLoading(false);
    }
};
```

### 3. Actualizar el Recibo Térmico

En `components/fiscal/ThermalReceipt.tsx`, asegúrate de mostrar el CAE cuando exista:

```typescript
{invoice.cae && (
    <div className="text-center mt-4">
        <p className="text-xs">CAE: {invoice.cae}</p>
        <p className="text-xs">Vto CAE: {formatDate(invoice.cae_vencimiento)}</p>
    </div>
)}
```

## Testing

1. Configura certificados de homologación en `/settings/afip`
2. Crea una venta de prueba en el POS
3. Selecciona "Factura B" como comprobante
4. Verifica que:
   - Se muestra "Generando CAE..." durante la espera
   - La venta se completa con éxito
   - El CAE aparece en el ticket
   - En Firestore se guarda el campo `cae`

## Troubleshooting

**Error: "No hay certificados AFIP configurados"**
→ Sube certificados en `/settings/afip`

**Error: "AFIP no devolvió CAE"**
→ Verifica que el certificado sea válido
→ Revisa que estés en el modo correcto (testing vs producción)

**Sale sin CAE**
→ Confirma que el módulo `afip_fiscal` esté habilitado en la configuración del tenant
