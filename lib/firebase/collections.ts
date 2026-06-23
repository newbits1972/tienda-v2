import { collection, CollectionReference, DocumentData } from 'firebase/firestore';
import { db } from './config';
import type {
    Product,
    ProductVariant,
    Sale,
    Customer,
    Invoice,
    Supplier,
    CashRegister,
    Branch,
    Transfer,
    StockMovement,
} from '@/lib/types';

// Typed collection references
export const productsCollection = collection(db, 'products') as CollectionReference<Product>;
export const productVariantsCollection = collection(db, 'product_variants') as CollectionReference<ProductVariant>;
export const salesCollection = collection(db, 'sales') as CollectionReference<Sale>;
export const customersCollection = collection(db, 'customers') as CollectionReference<Customer>;
export const invoicesCollection = collection(db, 'invoices') as CollectionReference<Invoice>;
export const suppliersCollection = collection(db, 'suppliers') as CollectionReference<Supplier>;
export const cashRegistersCollection = collection(db, 'cash_registers') as CollectionReference<CashRegister>;
export const branchesCollection = collection(db, 'branches') as CollectionReference<Branch>;
export const transfersCollection = collection(db, 'transfers') as CollectionReference<Transfer>;
export const stockMovementsCollection = collection(db, 'stock_movements') as CollectionReference<StockMovement>;
