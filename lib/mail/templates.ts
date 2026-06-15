export const getInvitationEmailTemplate = (nombre: string, tienda: string, link: string) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitación a DataSense Food</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #0c0c0e;
                    color: #ffffff;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #121214;
                    border: 1px solid #1f1f23;
                    border-radius: 12px;
                    overflow: hidden;
                    margin-top: 40px;
                }
                .header {
                    background-color: #0c0c0e;
                    padding: 30px;
                    text-align: center;
                    border-bottom: 1px solid #d4af37;
                }
                .logo {
                    font-size: 24px;
                    font-weight: bold;
                    color: #d4af37;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }
                .content {
                    padding: 40px;
                    line-height: 1.6;
                }
                .title {
                    font-size: 20px;
                    font-weight: 600;
                    margin-bottom: 20px;
                    color: #d4af37;
                }
                .text {
                    color: #a1a1aa;
                    font-size: 16px;
                    margin-bottom: 30px;
                }
                .button-container {
                    text-align: center;
                    margin: 40px 0;
                }
                .button {
                    background-color: #d4af37;
                    color: #000000;
                    padding: 14px 28px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: bold;
                    font-size: 16px;
                    display: inline-block;
                    transition: background-color 0.3s ease;
                }
                .footer {
                    background-color: #0c0c0e;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #52525b;
                    border-top: 1px solid #1f1f23;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">DATASENSE FOOD</div>
                </div>
                <div class="content">
                    <div class="title">Hola, ${nombre}</div>
                    <div class="text">
                        Has sido invitado a gestionar la tienda <strong>${tienda}</strong> en nuestra plataforma. 
                        A partir de ahora, podrás administrar ventas, productos y reportes de forma centralizada.
                    </div>
                    <div class="text">
                        Para comenzar y configurar tu acceso personal, haz clic en el siguiente enlace:
                    </div>
                    <div class="button-container">
                        <a href="${link}" class="button">Activar Mi Cuenta</a>
                    </div>
                    <div class="text" style="font-size: 14px; margin-top: 20px;">
                        Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                        <span style="color: #71717a; word-break: break-all;">${link}</span>
                    </div>
                </div>
                <div class="footer">
                    &copy; ${new Date().getFullYear()} DataSense Food. Sistema Profesional de Gestión.
                </div>
            </div>
        </body>
        </html>
    `;
};
