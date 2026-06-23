import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
    title: "DataSense Retail SaaS - Landing",
    description: "Solución SaaS para tiendas de ropa, calzado, zapaterías y comercio minorista",
};

export default function LandingPage() {
    return (
        <div className="landing-root">
            <header className="hero">
                <div className="hero-inner container">
                    <Image src="/logo.png" alt="DataSense Retail Logo" className="logo" width={110} height={110} />
                    <h1>DataSense Retail SaaS</h1>
                    <p>La solución integral para la gestión y punto de venta de tiendas de ropa, calzado y comercio minorista</p>
                </div>
            </header>

            <main className="container content">
                <section className="intro card">
                    <p>DataSense Retail no es solo un software de facturación; es un sistema operativo completo diseñado para transformar la eficiencia y la rentabilidad de tiendas de indumentaria, zapaterías, mueblerías y comercios minoristas en Argentina. Nuestra plataforma ofrece herramientas avanzadas de administración multi-sucursal, control de stock por variante (talle y color) y facturación integrada.</p>
                </section>

                <section className="modules grid">
                    <div className="card">
                        <h3>1. Punto de Venta (POS) Especializado</h3>
                        <p>Rapidez y eficiencia en el checkout físico de tu local.</p>
                        <ul>
                            <li>Soporte de Escáner Físico: Lectura instantánea de códigos de barras (SKU o EAN-13).</li>
                            <li>Matriz de Talles y Colores: Selector rápido al cobrar prendas con variantes.</li>
                            <li>Múltiples Métodos de Pago: Efectivo, tarjeta de débito/crédito, transferencia bancaria, Mercado Pago (QR/Point) y Cuenta Corriente de clientes.</li>
                            <li>Arqueo de Caja Seguro: Apertura y cierre de caja por turno con reporte ciego de diferencias.</li>
                        </ul>
                    </div>
                    <div className="card">
                        <h3>2. Omnicanalidad Real (BOPIS / BORIS)</h3>
                        <p>Integra la experiencia física y digital de tus clientes.</p>
                        <ul>
                            <li>BOPIS (Buy Online, Pick Up In Store): Permite que los clientes compren en la tienda online y retiren en cualquier sucursal física de forma ágil.</li>
                            <li>BORIS (Buy Online, Return In Store): Devoluciones o cambios unificados. Permite retornar en el local físico productos comprados online, actualizando stock automáticamente.</li>
                            <li>Catálogo Online Integrado: Tienda pública autogenerada por comercio para ventas directas sin comisiones.</li>
                        </ul>
                    </div>
                    <div className="card">
                        <h3>3. Control de Stock y Multi-Sucursal</h3>
                        <p>Administra múltiples depósitos y locales desde una sola pantalla.</p>
                        <ul>
                            <li>Matriz de Inventario: Control atómico de stock por combinación de Talle y Color.</li>
                            <li>Transferencias Internas: Envío documentado de mercadería entre sucursales con seguimiento de "Stock en Tránsito".</li>
                            <li>Etiquetas y Códigos de Barra: Generador e impresor de etiquetas de productos.</li>
                            <li>Compras y Proveedores: Registro de facturas de compra y actualización de costos de reposición.</li>
                        </ul>
                    </div>
                </section>

                <section className="section-intel card">
                    <h3>Inteligencia de Negocio y Finanzas</h3>
                    <div className="grid two">
                        <div>
                            <h4>Cuentas Corrientes y Crédito</h4>
                            <p>Fideliza a tus clientes recurrentes ofreciendo cuentas corrientes con límite de crédito controlado y trazabilidad de pagos.</p>
                            <ul>
                                | Historial de compras y saldos adeudados por cliente.
                                | Carga rápida de pagos de clientes.
                            </ul>
                        </div>
                        <div>
                            <h4>Reportes y Analíticas</h4>
                            <p>Visualiza gráficos de ventas semanales, ticket promedio y ranking de las prendas y talles más vendidos.</p>
                            <ul>
                                | Dashboard gerencial en tiempo real.
                                | Alertas de stock bajo el mínimo configurado.
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="section-integrations card">
                    <h3>Integraciones Estratégicas y SaaS</h3>
                    <ul>
                        <li>Mercado Pago Integrated: Sincronización automática del monto a cobrar a terminales Point o QR dinámico en pantalla.</li>
                        <li>Facturación Electrónica AFIP: Emisión legal de Facturas A, B y C con CAE y código QR normativo directo desde el POS.</li>
                        <li>Arquitectura Multi-Inquilino (SaaS): Seguridad bancaria con aislamiento lógico de base de datos por tenant bajo Google Cloud & Firebase.</li>
                    </ul>
                </section>

                <section className="cta card" style={{ textAlign: "center" }}>
                    <Image src="/logo.png" alt="DataSense Retail Logo" width={120} height={120} style={{ opacity: 0.9 }} />
                    <h2>DataSense Retail: La plataforma definitiva para el comercio minorista</h2>
                    <p>Propuesta Técnica-Comercial | 2026</p>
                    <a href="#contact" className="btn">Solicita una demo</a>
                </section>
            </main>

            <style>{`
                .landing-root { font-family: Arial, sans-serif; color: #333; }
                .container { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
                .hero { padding: 40px 0; color: white; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); }
                .hero .logo { width: 110px; display:block; margin: 0 auto 12px; }
                h1 { margin: 6px 0 8px; font-size: 2rem; text-align: center; }
                .hero p { text-align: center; font-size: 1.1rem; opacity: 0.9; }
                .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; }
                .grid.two { grid-template-columns: 1fr 1fr; }
                .card { background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 2px 6px rgba(0,0,0,.05); border: 1px border-zinc-150; margin-bottom: 20px; }
                h3 { font-size: 1.1rem; margin: 0 0 8px; color: #1e3a8a; }
                h4 { font-size: 1rem; margin: 6px 0; color: #1e3a8a; }
                ul { padding-left: 20px; margin: 6px 0; }
                .btn { background: #1e3a8a; color: #fff; padding: 12px 18px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 15px; }
                .btn:hover { background: #1d4ed8; }
                @media (max-width: 900px) {
                    .grid { grid-template-columns: 1fr; }
                    .hero { padding: 20px 0; }
                }
            `}</style>
        </div>
    );
}
