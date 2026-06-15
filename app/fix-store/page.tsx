'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { StoreConfig } from '@/lib/types';

export default function FixStorePage() {
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const fixDefaultStore = async () => {
        setLoading(true);
        setStatus('Verificando default_store...');
        try {
            const tenantId = 'default_store';
            const configRef = doc(db, 'store_configs', tenantId);
            const snap = await getDoc(configRef);

            if (snap.exists()) {
                setStatus('✅ La tienda "default_store" ya existe.');
            } else {
                setStatus('Creando "default_store"...');
                const newConfig: any = {
                    nombre: 'PedidosIA',
                    razonSocial: 'PedidosIA S.A.',
                    cuit: '30-11223344-9',
                    direccion: 'Sede Central',
                    telefono: '1122334455',
                    whatsapp: '541122334455',
                    rubro: 'Gastronomía Inteligente',
                    alias: 'pedidos.ia',
                    cbu: '0000003100000000000000',
                    active: true,
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp(),
                    mercadoPago: {
                        accessToken: '',
                        publicKey: ''
                    },
                    afip: {
                        cuit: '',
                        punto_venta: 1
                    }
                };
                await setDoc(configRef, newConfig);
                setStatus('✅ Tienda "default_store" creada con éxito. Ahora podés entrar al catálogo.');
            }
        } catch (error: any) {
            console.error(error);
            setStatus('❌ Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6 font-sans">
            <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl p-8 text-center border border-zinc-100">
                <div className="w-16 h-16 bg-[#FFBC0D]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl">🛠️</span>
                </div>
                <h1 className="text-2xl font-black text-zinc-900 mb-2 uppercase tracking-tight">Reparar Catálogo</h1>
                <p className="text-zinc-500 mb-8 font-medium">Esta herramienta creará la configuración básica para "default_store" si no existe.</p>

                <div className="bg-zinc-50 rounded-2xl p-4 mb-8 min-h-[60px] flex items-center justify-center border border-zinc-100 italic text-sm text-zinc-600">
                    {status || 'Listo para verificar...'}
                </div>

                <Button
                    onClick={fixDefaultStore}
                    disabled={loading}
                    className="w-full h-14 bg-[#FFBC0D] hover:bg-[#E5A900] text-zinc-900 font-black rounded-xl text-lg uppercase tracking-widest shadow-lg shadow-[#FFBC0D]/20 transition-all active:scale-95"
                >
                    {loading ? 'Procesando...' : 'Reparar Ahora'}
                </Button>

                <p className="mt-6 text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
                    Una vez reparado, podrás acceder a <br />
                    <span className="text-zinc-900 whitespace-nowrap">/catalogo/default_store</span>
                </p>
            </div>
        </div>
    );
}
