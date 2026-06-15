import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
    title: "PedidosIA Gastronomía SaaS - Landing",
    description: "Solución SaaS para restaurantes: módulos core, IA e integraciones",
};

export default function LandingPage() {
    return (
        <div className="landing-root">
            <header className="hero">
                <div className="hero-inner container">
                    <Image src="/logo.png" alt="PedidosIA Logo" className="logo" width={110} height={110} />
                    <h1>PedidosIA Gastronomía SaaS</h1>
                    <p>La solución integral para el sector gastronómico moderno</p>
                </div>
            </header>

            <main className="container content">
                <section className="intro card">
                    <p>PedidosIA no es solo un software de ventas; es un sistema operativo diseñado para transformar la eficiencia operativa y la rentabilidad de restaurantes, rotiserías, casas de viandas y negocios de delivery. Nuestra plataforma SaaS ofrece una infraestructura robusta de estándar corporativo, adaptada a las necesidades reales de la gastronomía actual.</p>
                </section>

                <section className="modules grid">
                    <div className="card">
                        <h3>1. Monitor de Cocina (KDS - Kitchen Display System)</h3>
                        <p>La inteligencia táctil que revoluciona la producción gastronómica.</p>
                        <ul>
                            <li>Sincronización Atómica en Tiempo Real: notificaciones instantáneas entre pedido y cocina.</li>
                            <li>Gestión por Prioridades y Canales: Delivery, Salón y Mostrador.</li>
                            <li>Detalle Granular de Elaboración: variantes, extras y notas especiales.</li>
                            <li>Interfaz Táctica Optimizada: botones grandes para uso en cocina.</li>
                            <li>Higiene y Sustentabilidad: eliminación de tickets en papel.</li>
                            <li>Analítica de Producción: trazabilidad del tiempo por plato.</li>
                        </ul>
                    </div>
                    <div className="card">
                        <h3>2. Gestión de Salón y Camareros</h3>
                        <p>Excelencia en la atención y máxima rotación de mesas.</p>
                        <ul>
                            <li>Mapa de Mesas Táctil e Interactivo.</li>
                            <li>Comanda Digital desde Tablets o Celulares.</li>
                            <li>Gestión Dinámica de Cuentas: adición de ítems y cierres de mesa.</li>
                            <li>Fidelización Instantánea: historial de cuentas vinculado al perfil del cliente.</li>
                            <li>Optimización de Rotación: mayor capacidad de servicio y ingresos.</li>
                        </ul>
                    </div>
                    <div className="card">
                        <h3>3. Logística de Delivery y Reparto</h3>
                        <p>Tu propia flota de envíos bajo control.</p>
                        <ul>
                            <li>Centro de Despacho Inteligente: asignación con un clic.</li>
                            <li>Gestión de Estados de Envío: Listo para salir, En camino, Entregado.</li>
                            <li>Herramientas para el Repartidor (Mobile Friendly).</li>
                            <li>Comunicación Omnicanal: WhatsApp y geolocalización.</li>
                            <li>Auditoría de Entregas: historial detallado por repartidor.</li>
                        </ul>
                    </div>
                </section>

                <section className="section-intel card">
                    <h3>Inteligencia de Negocio e Inventarios</h3>
                    <div className="grid two">
                        <div>
                            <h4>Gestión de Costos y Recetas</h4>
                            <p>Ingeniería de recetas y costos de reposición que se actualizan automáticamente al registrar facturas.</p>
                            <ul>
                                <li>Fórmulas maestras que vinculan platos con insumos.</li>
                                <li>Actualización automática de costos por insumos.</li>
                                <li>Visualización dinámica de márgenes y alertas de rentabilidad.</li>
                                <li>Control de stock con detección de mermas.</li>
                            </ul>
                        </div>
                        <div>
                            <h4>Reportes de Gestión Avanzados</h4>
                            <p>Ranking de ventas y arqueo de caja con seguridad y trazabilidad.</p>
                            <ul>
                                <li>Ranking de ventas por plato.</li>
                                <li>Arqueo de caja ciego y reportes de diferencias.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="section-integrations card">
                    <h3>Integraciones Estratégicas y SaaS</h3>
                    <ul>
                        <li>Mercado Pago Integrated: pagos sin errores y QR/Point automáticos.</li>
                        <li>Facturación Electrónica AFIP: facturas con CAE y QR directos desde el POS.</li>
                        <li>SaaS Multi-Tenancy & Seguridad: aislamiento por tenant y alta disponibilidad en la nube.</li>
                    </ul>
                    <p>PedidosIA se apoya en Google Cloud & Firebase con seguridad de nivel empresarial y respaldo geo-redundante.</p>
                </section>

                <section className="cta card" style={{ textAlign: "center" }}>
                    <Image src="/logo.png" alt="PedidosIA Logo" width={120} height={120} style={{ opacity: 0.9 }} />
                    <h2>PedidosIA: Tecnología diseñada para el éxito de tu negocio de comidas</h2>
                    <p>Propuesta Técnica-Comercial | Enero 2026</p>
                    <a href="#contact" className="btn">Solicita una demo</a>
                </section>
            </main>

            <style>{`
                .landing-root { font-family: Arial, sans-serif; color: #333; }
                .container { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
                .hero { padding: 40px 0; color: white; background: linear-gradient(135deg, #1f3a93 0%, #2f6f8f 60%, #2b9a66 100%); }
                .hero .logo { width: 110px; display:block; margin: 0 auto 12px; }
                h1 { margin: 6px 0 8px; font-size: 2rem; }
                .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                .grid.two { grid-template-columns: 1fr 1fr; }
                .card { background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 2px 6px rgba(0,0,0,.05); }
                .modules .card { display: block; }
                h3 { font-size: 1.1rem; margin: 0 0 8px; }
                h4 { font-size: 1rem; margin: 6px 0; }
                ul { padding-left: 20px; margin: 6px 0; }
                .image { width: 100%; height: auto; border-radius: 6px; }
                .section-intel, .section-integrations { margin-top: 20px; }
                .cta { text-align: center; padding: 28px 0; }
                .btn { background: #1e40af; color: #fff; padding: 12px 18px; border-radius: 6px; text-decoration: none; font-weight: 600; }
                @media (max-width: 900px) {
                    .grid { grid-template-columns: 1fr; }
                    .hero { padding: 20px 0; }
                }
            `}</style>
        </div>
    );
}
