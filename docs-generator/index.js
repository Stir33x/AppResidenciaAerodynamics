const puppeteer = require('puppeteer');
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } = require('docx');

async function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
}

(async () => {
    try {
        console.log('Starting browser...');
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });

        console.log('Navigating to login page...');
        await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

        console.log('Logging in...');
        await page.type('input[type="email"]', 'rodriguezruizalberto14@gmail.com');
        await page.type('input[type="password"]', 'qwerty12345');
        await page.click('button[type="submit"]');

        await delay(2000); // wait for redirect and load

        const screenshots = {};
        const pagesToVisit = [
            { id: 'dashboard', path: '/dashboard', name: 'Dashboard' },
            { id: 'alumnos', path: '/alumnos', name: 'Alumnos' },
            { id: 'limpieza', path: '/limpieza', name: 'Limpieza' },
            { id: 'incidencias', path: '/incidencias', name: 'Incidencias' },
            { id: 'horarios', path: '/horarios', name: 'Horarios' },
            { id: 'documentos', path: '/documentos', name: 'Documentos' },
            { id: 'pagos', path: '/pagos', name: 'Pagos' },
            { id: 'habitaciones', path: '/habitaciones', name: 'Habitaciones' },
            { id: 'inventario', path: '/inventario', name: 'Inventario' },
            { id: 'configuracion', path: '/configuracion', name: 'Configuracion' },
            { id: 'usuarios', path: '/usuarios', name: 'Usuarios' },
        ];

        for (const p of pagesToVisit) {
            console.log(`Capturing ${p.name}...`);
            await page.goto(`http://localhost:5173${p.path}`, { waitUntil: 'networkidle2' });
            await delay(1500); // allow data to fetch and render
            screenshots[p.id] = await page.screenshot({ encoding: 'base64', fullPage: false });
        }

        await browser.close();
        console.log('Browser closed. Generating DOCX...');

        // Create document
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: "App Residencia Aerodynamics - Plataforma Integral de Gestión",
                        heading: HeadingLevel.TITLE,
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Este documento presenta una visión exhaustiva de la plataforma desarrollada para la Residencia Aerodynamics. Se detallan todas las funcionalidades implementadas que permiten digitalizar, automatizar y gestionar el 100% de las operativas del alojamiento.",
                                size: 24, // 12pt
                            }),
                        ],
                    }),
                    
                    // 1. Dashboard
                    new Paragraph({ text: "1. Dashboard Global y Centro de Mando", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: "Un panel de control en tiempo real diseñado para la Dirección y Administración. Proporciona estadísticas vitales de un solo vistazo: alumnos activos en la instalación, progreso de las tareas de limpieza del día en curso, número de incidencias abiertas y recibos pendientes de cobro." }),
                    new Paragraph({ children: [new ImageRun({ data: Buffer.from(screenshots['dashboard'], 'base64'), transformation: { width: 600, height: 375 } })] }),

                    // 2. Alumnos
                    new Paragraph({ text: "2. Gestión Integral de Alumnos", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: "El módulo central de la residencia. Permite realizar altas y bajas de estudiantes, asignarles habitaciones disponibles, vincular sus contratos de alojamiento, definir sus cuotas y controlar si tienen acceso permitido a sus habitaciones. Todo el ciclo de vida del alumno queda registrado y centralizado." }),
                    new Paragraph({ children: [new ImageRun({ data: Buffer.from(screenshots['alumnos'], 'base64'), transformation: { width: 600, height: 375 } })] }),

                    // 3. Limpieza
                    new Paragraph({ text: "3. Sistema Avanzado de Limpieza", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: "Revoluciona el mantenimiento de las instalaciones mediante 'bloques de limpieza'. Permite planificar qué habitaciones y zonas comunes se limpian cada día y en qué horarios. Además, el personal cuenta con checklists específicos (qué hay que hacer en cada sala) y recibe avisos automáticos de ausencia de los alumnos para no molestarles." }),
                    new Paragraph({ children: [new ImageRun({ data: Buffer.from(screenshots['limpieza'], 'base64'), transformation: { width: 600, height: 375 } })] }),

                    // 4. Incidencias
                    new Paragraph({ text: "4. Gestión y Resolución de Incidencias", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: "Un canal de comunicación directo entre estudiantes y el equipo de mantenimiento. Los alumnos pueden reportar daños en sus habitaciones o en zonas comunes. El equipo administrativo clasifica la urgencia, asigna a un responsable y hace el seguimiento (Reportada, En curso, Resuelta, Cerrada)." }),
                    new Paragraph({ children: [new ImageRun({ data: Buffer.from(screenshots['incidencias'], 'base64'), transformation: { width: 600, height: 375 } })] }),

                    // 5. Horarios
                    new Paragraph({ text: "5. Horarios de Servicios", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: "Una cartelera digital interactiva. Desde aquí se comunican los horarios de todos los servicios asociados: transporte, comedor, cafetería, uso de instalaciones y más. El sistema los organiza visualmente por días de la semana para que la información esté clara tanto para staff como para residentes." }),
                    new Paragraph({ children: [new ImageRun({ data: Buffer.from(screenshots['horarios'], 'base64'), transformation: { width: 600, height: 375 } })] }),

                    // 6. Documentos
                    new Paragraph({ text: "6. Repositorio Documental", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: "Un disco en la nube privado para la residencia. Facilita la subida de documentos asociados a cada estudiante (contratos escaneados, DNI, justificantes médicos, partes, recibos). Cada documento es categorizado y asegurado, permitiendo a los estudiantes descargar sus propios archivos cuando los necesiten." }),
                    new Paragraph({ children: [new ImageRun({ data: Buffer.from(screenshots['documentos'], 'base64'), transformation: { width: 600, height: 375 } })] }),

                    // 7. Pagos
                    new Paragraph({ text: "7. Pagos y Facturación Periódica", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: "Módulo financiero que automatiza la tesorería de la residencia. Destaca su potente motor de 'Generación de Recibos': con un par de clics, se pueden generar los recibos mensuales, trimestrales o anuales para todos los alumnos. Se visualizan deudores, vencimientos y estados de cobro." }),
                    new Paragraph({ children: [new ImageRun({ data: Buffer.from(screenshots['pagos'], 'base64'), transformation: { width: 600, height: 375 } })] }),

                    // 8. Habitaciones
                    new Paragraph({ text: "8. Gestión de Habitaciones y Espacios", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: "Visualización rápida de todo el bloque de alojamiento. Permite dar de alta nuevas habitaciones, ver cuáles están libres u ocupadas, y mantener organizado el inventario de estancias." }),
                    new Paragraph({ children: [new ImageRun({ data: Buffer.from(screenshots['habitaciones'], 'base64'), transformation: { width: 600, height: 375 } })] }),

                    // 9. Inventario
                    new Paragraph({ text: "9. Control de Inventario y Almacén", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: "Mantiene un registro exacto de los bienes de la residencia. Permite crear un catálogo de artículos (camas, armarios, papeleras) y asignar existencias a habitaciones específicas, a zonas comunes, o mantenerlas en un almacén general. Si se mueve mobiliario, el sistema registra el traslado." }),
                    new Paragraph({ children: [new ImageRun({ data: Buffer.from(screenshots['inventario'], 'base64'), transformation: { width: 600, height: 375 } })] }),

                    // 10. Configuración
                    new Paragraph({ text: "10. Configuración Central y Checklists", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: "El corazón del sistema. Aquí el administrador configura las zonas comunes, los tipos de documentos, los bloques horarios, y lo más importante: los Checklists de Alta y Baja. Estos checklists garantizan que ningún trabajador olvide los pasos obligatorios (entregar llaves, firmar normas, revisar habitación) al registrar o despedir a un estudiante." }),
                    new Paragraph({ children: [new ImageRun({ data: Buffer.from(screenshots['configuracion'], 'base64'), transformation: { width: 600, height: 375 } })] }),

                    // 11. Usuarios
                    new Paragraph({ text: "11. Administración de Usuarios y Seguridad", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: "Gestión estricta de accesos. Permite invitar a nuevos empleados (Dirección, Administración, Limpieza). La plataforma limita automáticamente lo que cada trabajador puede ver o modificar, protegiendo los datos confidenciales de la residencia." }),
                    new Paragraph({ children: [new ImageRun({ data: Buffer.from(screenshots['usuarios'], 'base64'), transformation: { width: 600, height: 375 } })] }),

                ],
            }],
        });

        Packer.toBuffer(doc).then((buffer) => {
            fs.writeFileSync('../Presentacion_Aerodynamics_Completa.docx', buffer);
            console.log('Document created successfully at Presentacion_Aerodynamics_Completa.docx');
        });

    } catch (e) {
        console.error(e);
    }
})();
