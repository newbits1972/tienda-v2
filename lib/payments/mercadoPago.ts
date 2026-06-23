import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

/**
 * Returns a Mercado Pago client initialized with the provided access token.
 */
export function getMPClient(token: string) {
    return new MercadoPagoConfig({
        accessToken: token,
        options: { timeout: 5000 }
    });
}

export async function createPreference(
    accessToken: string,
    tenantId: string,
    items: any[],
    externalReference: string,
    customBackUrls?: { success: string; failure: string; pending: string }
) {
    const client = getMPClient(accessToken);
    const preference = new Preference(client);

    const mpItems = items.map(item => {
        // Handle both OnlineOrderItem and CartItem formats
        const product = item.producto;
        const variant = item.variante;
        const quantity = item.cantidad || 1;
        const baseUnit = variant?.precio_venta ?? product?.precio_venta ?? 0;
        const subtotal = item.subtotal || (baseUnit * quantity);
        const unitPrice = subtotal / quantity;

        const titleParts = [product?.nombre || 'Producto'];
        if (variant) titleParts.push(`(${variant.talle}/${variant.color})`);

        return {
            id: variant?.sku || product?.id || 'id-desconocido',
            title: titleParts.join(' '),
            unit_price: Number(unitPrice.toFixed(2)),
            quantity: Number(quantity),
            currency_id: 'ARS'
        };
    });

    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
    }

    // Mercado Pago notification_url MUST be HTTPS in production
    const isLocal = baseUrl.includes('localhost');
    const webhookUrl = `${baseUrl}/api/mercadopago/webhook?tenantId=${encodeURIComponent(tenantId)}`;

    const defaultBackUrls = {
        success: `${baseUrl}/pos?status=success`,
        failure: `${baseUrl}/pos?status=failure`,
        pending: `${baseUrl}/pos?status=pending`,
    };

    return preference.create({
        body: {
            items: mpItems,
            external_reference: externalReference,
            back_urls: customBackUrls || defaultBackUrls,
            auto_return: 'approved',
            notification_url: webhookUrl,
            payment_methods: {
                excluded_payment_types: [
                    { id: 'bank_transfer' },
                    { id: 'ticket' }
                ]
            }
        }
    });
}

/**
 * Creates a QR Order for physical POS
 */
export async function createQROrder(accessToken: string, tenantId: string, totalAmount: number, description: string, externalReference: string) {
    const mockItem = {
        producto: {
            id: 'pos-sale',
            nombre: description,
            precio_venta: totalAmount,
        },
        cantidad: 1,
        subtotal: totalAmount
    };

    return createPreference(accessToken, tenantId, [mockItem], externalReference);
}

/**
 * Creates a Point Payment Intent to be processed on a physical terminal
 */
export async function createPointPaymentIntent(accessToken: string, deviceId: string, amount: number, externalReference: string) {
    // Endpoint correcto según documentación oficial de MercadoPago
    const url = `https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents`;

    const amountInCents = Math.round(Number(amount) * 100);

    console.log('[MP createPointPaymentIntent] URL:', url);
    console.log('[MP createPointPaymentIntent] Payload:', { originalAmount: amount, amountInCents, deviceId, externalReference });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: amountInCents,
            additional_info: {
                external_reference: externalReference
            }
        })
    });

    const data = await response.json();

    console.log('[MP createPointPaymentIntent] Response status:', response.status);
    console.log('[MP createPointPaymentIntent] Response data:', data);

    if (!response.ok) {
        throw new Error(data.message || data.error || 'Error al crear la intención de pago en el Point');
    }

    return data;
}

/**
 * Gets the list of Point devices associated with the account
 */
export async function getPointDevices(accessToken: string) {
    // Usar el endpoint correcto de integración
    const url = 'https://api.mercadopago.com/point/integration-api/devices';

    console.log('[MP Point] Consultando dispositivos en:', url);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        console.log('[MP Point] Status:', response.status);
        console.log('[MP Point] Respuesta completa:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            // Devolver el error específico de MercadoPago
            return {
                devices: [],
                error: data.message || `Error ${response.status}`,
                errorDetails: data
            };
        }

        // La API puede devolver { devices: [...] } o { paging: {...}, results: [...] }
        const devices = data.devices || data.results || [];

        return {
            devices,
            total: devices.length
        };
    } catch (error: any) {
        console.error('[MP Point] Error de red:', error);
        return {
            devices: [],
            error: 'Error de conexión: ' + error.message
        };
    }
}

/**
 * Gets the status of a specific Point Payment Intent
 */
export async function getPointPaymentIntent(accessToken: string, paymentIntentId: string) {
    // Endpoint correcto para consultar el estado
    const url = `https://api.mercadopago.com/point/integration-api/payment-intents/${paymentIntentId}`;

    console.log('[MP getPointPaymentIntent] URL:', url);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();

    console.log('[MP getPointPaymentIntent] Status:', response.status);
    console.log('[MP getPointPaymentIntent] Data:', data);

    if (!response.ok) {
        throw new Error(data.message || data.error || 'Error al consultar el estado de la intención de pago');
    }

    return data;
}
/**
 * Changes the operating mode of a Point device (PDV or STANDALONE)
 */
export async function changePointMode(accessToken: string, deviceId: string, mode: 'PDV' | 'STANDALONE') {
    const url = `https://api.mercadopago.com/point/integration-api/devices/${deviceId}`;

    console.log('[MP changePointMode] URL:', url);
    console.log('[MP changePointMode] Payload:', { operating_mode: mode });

    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            operating_mode: mode
        })
    });

    let data: any = {};
    const text = await response.text();
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('[MP changePointMode] Error al parsear JSON:', text);
        }
    }

    console.log('[MP changePointMode] Status:', response.status);
    console.log('[MP changePointMode] Data:', data);

    if (!response.ok) {
        throw new Error(data.message || data.error || `Error ${response.status}: El dispositivo no permitió el cambio de modo.`);
    }

    return data;
}

/**
 * Cancels the current payment intent for a specific device
 */
export async function cancelPointPaymentIntent(accessToken: string, deviceId: string) {
    const url = `https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents`;

    console.log('[MP cancelPointPaymentIntent] URL:', url);

    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 204) {
        return { success: true };
    }

    let data: any = {};
    const text = await response.text();
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('[MP cancelPointPaymentIntent] Error al parsear JSON:', text);
        }
    }

    console.log('[MP cancelPointPaymentIntent] Status:', response.status);
    console.log('[MP cancelPointPaymentIntent] Data:', data);

    if (!response.ok) {
        // Si el error es que no hay intención activa, lo tratamos como éxito (ya está liberado)
        if (response.status === 400 && (text.includes('no open payment intent') || text.includes('not_found'))) {
            return { success: true, message: 'No había cobros pendientes' };
        }
        throw new Error(data.message || data.error || 'Error al liberar la terminal');
    }

    return { ...data, success: true };
}
