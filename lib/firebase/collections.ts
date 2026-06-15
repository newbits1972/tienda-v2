import { collection, CollectionReference, DocumentData } from 'firebase/firestore';
import { db } from './config';
import type { Product, Sale, Customer, Invoice, Supplier, CashRegister } from '@/lib/types';

// Typed collection references
export const productsCollection = collection(db, 'products') as CollectionReference<Product>;
export const salesCollection = collection(db, 'sales') as CollectionReference<Sale>;
export const customersCollection = collection(db, 'customers') as CollectionReference<Customer>;
export const invoicesCollection = collection(db, 'invoices') as CollectionReference<Invoice>;
export const suppliersCollection = collection(db, 'suppliers') as CollectionReference<Supplier>;
export const cashRegistersCollection = collection(db, 'cash_registers') as CollectionReference<CashRegister>;
