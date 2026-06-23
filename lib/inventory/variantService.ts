import { collection, doc, getDoc, getDocs, query, where, writeBatch, Timestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { ProductVariant, StockMovement, Product } from '@/lib/types';

/**
 * Servicio de variantes (matriz talle×color) y stock.
 * Capa de lógica de negocio sobre Firestore.
 */

/**
 * Genera un SKU legible a partir del producto + variante.
 * Ej: "REM-BAS-NEG-M" para "Remera Básica Negra M".
 */
export function generateSKU(product: Product, talle: string, color: string): string {
    const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
        .replace(/[^A-Z0-9]/g, '').slice(0, 3);
    const marcaPart = product.marca ? slug(product.marca) : '';
    const basePart = slug(product.nombre);
    const colorPart = slug(color);
    const tallePart = slug(talle);
    return [marcaPart || basePart, basePart, colorPart, tallePart].filter(Boolean).join('-').slice(0, 20);
}

/**
 * Genera un EAN-13 válido (con dígito verificador) a partir de un número base.
 * Usa el prefijo "200" (in-house / distribución interna) que no colisiona con GS1 oficiales.
 */
export function generateEAN13(baseNumber: number): string {
    // Prefijo 200 + 9 dígitos del número base (total 12 dígitos) + check digit
    const padded = `200${String(baseNumber).padStart(9, '0')}`.slice(0, 12);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(padded[i]);
        sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return padded + checkDigit;
}

export interface CreateVariantInput {
    producto_id: string;
    producto_nombre?: string;
    tenantId: string;
    talle: string;
    color: string;
    color_hex?: string;
    precio_venta?: number;
    imagen_url?: string;
    stock_inicial?: number;
    stock_by_branch?: { [branchId: string]: number };
}

/**
 * Crea UNA variante de producto.
 */
export async function createVariant(input: CreateVariantInput): Promise<string> {
    const variantsRef = collection(db, 'product_variants');
    const productRef = doc(db, 'products', input.producto_id);

    // Generar SKU + código de barras únicos (basado en timestamp para evitar colisiones)
    const productSnap = await getDoc(productRef);
    const product = productSnap.exists() ? productSnap.data() as Product : null;
    const sku = generateSKU(product || { nombre: input.producto_nombre || '' } as Product, input.talle, input.color);
    const codigoBarras = generateEAN13(Date.now() % 1000000000);

    const stock_actual = input.stock_by_branch
        ? Object.values(input.stock_by_branch).reduce((a, b) => a + b, 0)
        : input.stock_inicial || 0;

    const newVariant: Omit<ProductVariant, 'id'> = {
        tenantId: input.tenantId,
        producto_id: input.producto_id,
        producto_nombre: input.producto_nombre || product?.nombre,
        talle: input.talle,
        color: input.color,
        color_hex: input.color_hex,
        sku,
        codigo_barras: codigoBarras,
        stock_actual,
        stock_minimo: 0,
        stock_by_branch: input.stock_by_branch || {},
        precio_venta: input.precio_venta,
        imagen_url: input.imagen_url,
        activo: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
    };

    const docRef = doc(variantsRef);
    await writeBatch(db)
        .set(docRef, newVariant)
        .commit();

    return docRef.id;
}

/**
 * Crea una CURVA COMPLETA de variantes (varios talles × varios colores) en un lote.
 * @param talles ["S","M","L","XL"]
 * @param colores [{nombre, hex}]
 * @param cantidadesPorTalle [1,2,2,2,1] — opcional, curva de cantidades
 */
export async function createVariantCurva(
    input: Omit<CreateVariantInput, 'talle' | 'color' | 'color_hex'> & {
        talles: string[];
        colores: { nombre: string; hex?: string }[];
        cantidadesPorTalle?: number[]; // opcional, por defecto 0 (carga luego)
    }
): Promise<string[]> {
    const { talles, colores, cantidadesPorTalle = talles.map(() => 0), ...base } = input;
    const createdIds: string[] = [];
    const batch = writeBatch(db);
    const variantsRef = collection(db, 'product_variants');

    // Fetch del producto padre para SKU
    const productSnap = await getDoc(doc(db, 'products', input.producto_id));
    const product = productSnap.exists() ? productSnap.data() as Product : null;

    let counter = Date.now() % 1000000000;

    for (const color of colores) {
        talles.forEach((talle, idxTalle) => {
            const cantidadInicial = cantidadesPorTalle[idxTalle] || 0;
            const sku = generateSKU(product || { nombre: base.producto_nombre || '' } as Product, talle, color.nombre);
            const codigoBarras = generateEAN13(counter++);

            const stock_by_branch = base.stock_by_branch
                ? Object.fromEntries(Object.entries(base.stock_by_branch).map(([bid, _]) => [bid, cantidadInicial]))
                : {};

            const newVariant: Omit<ProductVariant, 'id'> = {
                tenantId: base.tenantId,
                producto_id: base.producto_id,
                producto_nombre: base.producto_nombre || product?.nombre,
                talle,
                color: color.nombre,
                color_hex: color.hex,
                sku,
                codigo_barras: codigoBarras,
                stock_actual: cantidadInicial,
                stock_minimo: 0,
                stock_by_branch,
                precio_venta: base.precio_venta,
                imagen_url: base.imagen_url,
                activo: true,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
            };

            const docRef = doc(variantsRef);
            batch.set(docRef, newVariant);
            createdIds.push(docRef.id);
        });
    }

    await batch.commit();
    return createdIds;
}

/**
 * Obtiene todas las variantes de un producto.
 */
export async function getVariantsByProduct(producto_id: string): Promise<ProductVariant[]> {
    const q = query(collection(db, 'product_variants'), where('producto_id', '==', producto_id));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }) as ProductVariant);
}

/**
 * Busca una variante por código de barras o SKU (usado en el scanner del POS).
 */
export async function findVariantByCode(tenantId: string, code: string): Promise<{ variant: ProductVariant; product: Product | null } | null> {
    const q = query(
        collection(db, 'product_variants'),
        where('tenantId', '==', tenantId),
        where('codigo_barras', '==', code)
    );
    let snap = await getDocs(q);

    // Si no encuentra por código de barras, buscar por SKU
    if (snap.empty) {
        const q2 = query(
            collection(db, 'product_variants'),
            where('tenantId', '==', tenantId),
            where('sku', '==', code)
        );
        snap = await getDocs(q2);
    }

    if (snap.empty) return null;

    const variant = { ...snap.docs[0].data(), id: snap.docs[0].id } as ProductVariant;
    const productSnap = await getDoc(doc(db, 'products', variant.producto_id));
    const product = productSnap.exists() ? { ...productSnap.data(), id: productSnap.id } as Product : null;

    return { variant, product };
}

/**
 * Descuenta stock de una variante al vender (transaccional).
 * También registra el movimiento de stock.
 */
export async function decrementVariantStock(
    tenantId: string,
    variante_id: string,
    cantidad: number,
    branch_id: string | null,
    usuario_id: string,
    referencia_id?: string
): Promise<void> {
    await runTransaction(db, async (transaction) => {
        const variantRef = doc(db, 'product_variants', variante_id);
        const variantSnap = await transaction.get(variantRef);

        if (!variantSnap.exists()) throw new Error(`Variante ${variante_id} no existe`);

        const variant = variantSnap.data() as ProductVariant;
        const currentTotal = variant.stock_actual || 0;
        const newTotal = currentTotal - cantidad;

        if (newTotal < 0) {
            throw new Error(`Stock insuficiente para ${variant.talle} ${variant.color} (disponible: ${currentTotal})`);
        }

        // Actualizar stock total + stock por sucursal (si aplica)
        const updates: any = {
            stock_actual: newTotal,
            updated_at: Timestamp.now(),
        };
        if (branch_id && variant.stock_by_branch) {
            const currentBranch = variant.stock_by_branch[branch_id] || 0;
            updates[`stock_by_branch.${branch_id}`] = currentBranch - cantidad;
        }
        transaction.update(variantRef, updates);

        // Registrar movimiento (audit trail)
        const movementRef = doc(collection(db, 'stock_movements'));
        const movement: Omit<StockMovement, 'id'> = {
            tenantId,
            tipo: 'venta',
            variante_id,
            producto_id: variant.producto_id,
            producto_nombre: variant.producto_nombre,
            talle: variant.talle,
            color: variant.color,
            branch_origen: branch_id || undefined,
            cantidad: -cantidad, // negativo = sale
            referencia_id,
            usuario_id,
            fecha: Timestamp.now(),
        };
        transaction.set(movementRef, movement);
    });
}

/**
 * Transfiere stock entre sucursales (descuenta origen, suma destino).
 */
export async function transferVariantStock(
    tenantId: string,
    variante_id: string,
    branch_origen: string,
    branch_destino: string,
    cantidad: number,
    usuario_id: string,
    transfer_id?: string
): Promise<void> {
    await runTransaction(db, async (transaction) => {
        const variantRef = doc(db, 'product_variants', variante_id);
        const variantSnap = await transaction.get(variantRef);

        if (!variantSnap.exists()) throw new Error(`Variante ${variante_id} no existe`);

        const variant = variantSnap.data() as ProductVariant;
        const stockByBranch = variant.stock_by_branch || {};
        const currentOrigen = stockByBranch[branch_origen] || 0;

        if (currentOrigen < cantidad) {
            throw new Error(`Stock insuficiente en sucursal origen (disponible: ${currentOrigen})`);
        }

        stockByBranch[branch_origen] = currentOrigen - cantidad;
        stockByBranch[branch_destino] = (stockByBranch[branch_destino] || 0) + cantidad;

        transaction.update(variantRef, {
            stock_by_branch: stockByBranch,
            updated_at: Timestamp.now(),
        });

        // Movimiento origen (sale)
        const movementOutRef = doc(collection(db, 'stock_movements'));
        transaction.set(movementOutRef, {
            tenantId,
            tipo: 'transferencia',
            variante_id,
            producto_id: variant.producto_id,
            producto_nombre: variant.producto_nombre,
            talle: variant.talle,
            color: variant.color,
            branch_origen,
            branch_destino,
            cantidad: -cantidad,
            referencia_id: transfer_id,
            usuario_id,
            fecha: Timestamp.now(),
            nota: `Transferencia a ${branch_destino}`,
        });

        // Movimiento destino (entra)
        const movementInRef = doc(collection(db, 'stock_movements'));
        transaction.set(movementInRef, {
            tenantId,
            tipo: 'transferencia',
            variante_id,
            producto_id: variant.producto_id,
            producto_nombre: variant.producto_nombre,
            talle: variant.talle,
            color: variant.color,
            branch_origen,
            branch_destino,
            cantidad: cantidad,
            referencia_id: transfer_id,
            usuario_id,
            fecha: Timestamp.now(),
            nota: `Recepción desde ${branch_origen}`,
        });
    });
}
