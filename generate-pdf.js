const { jsPDF } = require('jspdf');
const fs = require('fs');

// Leer el contenido del archivo markdown
const markdownContent = fs.readFileSync('./PROPUESTA_GASTRONOMIA_SAAS.md', 'utf8');

// Crear instancia de jsPDF
const doc = new jsPDF();

// Configuración de página
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 20;
const contentWidth = pageWidth - 2 * margin;
let currentY = margin;

// Función para agregar texto con salto de línea automático
function addText(text, fontSize = 12, fontStyle = 'normal') {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    
    const lines = doc.splitTextToSize(text, contentWidth);
    
    for (let i = 0; i < lines.length; i++) {
        if (currentY + 10 > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
        }
        doc.text(lines[i], margin, currentY);
        currentY += 8;
    }
    
    currentY += 5; // Espacio después del párrafo
}

// Función para agregar un marcador de imagen
function addImagePlaceholder(description, width = 100, height = 60) {
    if (currentY + height + 20 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
    }
    
    // Dibujar rectángulo como marcador
    doc.setDrawColor(200);
    doc.rect(margin, currentY, width, height);
    
    // Agregar texto descriptivo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text(`[ESPACIO PARA IMAGEN: ${description}]`, margin + 5, currentY + height/2);
    
    // Restaurar color
    doc.setTextColor(0);
    
    currentY += height + 15;
}

// Función para agregar título
function addTitle(text) {
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    
    if (currentY + 20 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
    }
    
    doc.text(text, margin, currentY);
    currentY += 25;
}

// Función para agregar subtítulo
function addSubtitle(text) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    
    if (currentY + 15 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
    }
    
    doc.text(text, margin, currentY);
    currentY += 20;
}

// Función para agregar encabezado de sección
function addSectionHeader(text) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    
    if (currentY + 12 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
    }
    
    doc.text(text, margin, currentY);
    currentY += 15;
}

// Procesar el contenido markdown
function processMarkdown(content) {
    const lines = content.split('\n');
    let inCodeBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Saltar líneas vacías
        if (!line) {
            currentY += 5;
            continue;
        }
        
        // Títulos principales
        if (line.startsWith('# ')) {
            addTitle(line.substring(2));
        }
        // Subtítulos
        else if (line.startsWith('## ')) {
            addSubtitle(line.substring(3));
        }
        // Encabezados de sección
        else if (line.startsWith('### ')) {
            addSectionHeader(line.substring(4));
        }
        // Listas
        else if (line.startsWith('* ') || line.startsWith('- ')) {
            const listText = line.substring(2);
            addText('• ' + listText, 11, 'normal');
        }
        // Líneas separadoras
        else if (line.startsWith('---')) {
            if (currentY + 10 > pageHeight - margin) {
                doc.addPage();
                currentY = margin;
            }
            doc.setDrawColor(100);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 15;
        }
        // Línea de texto normal
        else {
            // Verificar si es una línea que podría tener imagen
            if (line.includes('KDS') || line.includes('Monitor de Cocina')) {
                addText(line, 12, 'normal');
                addImagePlaceholder('Monitor de Cocina KDS');
            } else if (line.includes('Mapa de Mesas') || line.includes('Tablets')) {
                addText(line, 12, 'normal');
                addImagePlaceholder('Mapa de Mesas Interactivo');
            } else if (line.includes('Delivery') || line.includes('Reparto')) {
                addText(line, 12, 'normal');
                addImagePlaceholder('Sistema de Delivery y Reparto');
            } else if (line.includes('Viandas') || line.includes('Menú Semanal')) {
                addText(line, 12, 'normal');
                addImagePlaceholder('Planificador de Viandas y Menú');
            } else if (line.includes('Mercado Pago') || line.includes('QR')) {
                addText(line, 12, 'normal');
                addImagePlaceholder('Integración Mercado Pago');
            } else if (line.includes('AFIP') || line.includes('Facturación')) {
                addText(line, 12, 'normal');
                addImagePlaceholder('Facturación Electrónica AFIP');
            } else if (line.includes('Google Cloud') || line.includes('Firebase')) {
                addText(line, 12, 'normal');
                addImagePlaceholder('Infraestructura Cloud Google');
            } else {
                addText(line, 12, 'normal');
            }
        }
    }
}

// Agregar portada
doc.addPage();
addTitle('PedidosIA Gastronomía SaaS');
addText('La Solución Integral para el Sector Gastronómico Moderno', 16, 'italic');
addImagePlaceholder('Logo Principal de PedidosIA', 120, 80);
addText('Propuesta Técnica-Comercial | Enero 2026', 14, 'bold');

// Agregar nueva página para el contenido
doc.addPage();
currentY = margin;

// Procesar el contenido del markdown
processMarkdown(markdownContent);

// Guardar el PDF
doc.save('PedidosIA_Propuesta_Gastronomia_SaaS.pdf');

console.log('PDF generado exitosamente: PedidosIA_Propuesta_Gastronomia_SaaS.pdf');