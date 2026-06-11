/* ==========================================
   CONFIGURACIÓN RÁPIDA DEL SISTEMA
   ========================================== */

/* 
   PASO 1: HABILITAR ACCESO DE ADMINISTRADOR
   
   Para acceder al panel administrativo por primera vez, necesitas habilitar el acceso.
   Hay dos formas de hacerlo:
*/

// OPCIÓN A: Desde la Consola del Navegador
// 1. Abre cualquier página del sitio
// 2. Presiona F12 para abrir DevTools
// 3. Ve a la pestaña "Consola"
// 4. Copia y pega esto:
localStorage.setItem('isAdmin', 'true');
// 5. Presiona Enter
// 6. Recarga la página (F5)
// 7. Ahora verás "Panel Admin" en el menú de navegación


// OPCIÓN B: Desde el Código (en tu página de login)
// En tu página de login o autenticación, agrega esto después de verificar credenciales:
localStorage.setItem('isAdmin', 'true');
// o si prefieres usando sessionStorage:
sessionStorage.setItem('userRole', 'admin');


/* 
   PASO 2: ACCEDER AL SISTEMA
*/

// Para Usuarios Regulares:
// 1. Ve a: vacantes de trabajo.html
// 2. Completa el formulario con tu información
// 3. Haz clic en "Enviar Solicitud"

// Para Administradores:
// 1. Primero habilita el acceso (Paso 1)
// 2. Ve a: admin-solicitudes.html
// 3. Ahora podrás revisar las solicitudes


/* 
   PASO 3: EJEMPLOS DE DATOS DE PRUEBA
   
   Si quieres probar el sistema, aquí hay datos de ejemplo que puedes usar:
*/

// Agregar datos de prueba en localStorage (copia en la consola):
localStorage.setItem('solicitudesEquipo', JSON.stringify([
    {
        id: "SOL-1234567890-TEST001",
        nombreCompleto: "María García López",
        fechaNacimiento: "1995-05-15",
        edad: 28,
        especialidad: "desarrollo-web",
        anosExperiencia: 4,
        habilidades: "JavaScript, React, HTML5, CSS3, Vue.js, Webpack, Git",
        disponibilidad: ["tiempo-completo", "remoto"],
        motivacion: "Me apasiona el desarrollo web y deseo contribuir al equipo técnico con mis conocimientos en frameworks modernos",
        estado: "pendiente",
        fechaSolicitud: "2024-01-25T14:30:00Z",
        idEmpleado: null,
        insignia: null,
        razonRechazo: null
    },
    {
        id: "SOL-1234567891-TEST002",
        nombreCompleto: "Carlos Martínez Ruiz",
        fechaNacimiento: "1992-08-22",
        edad: 31,
        especialidad: "bases-datos",
        anosExperiencia: 6,
        habilidades: "MySQL, PostgreSQL, MongoDB, Oracle, T-SQL, Redis, Elasticsearch",
        disponibilidad: ["tiempo-completo", "presencial"],
        motivacion: "Tengo amplia experiencia en administración de bases de datos y quiero formar parte de un equipo profesional",
        estado: "pendiente",
        fechaSolicitud: "2024-01-24T10:15:00Z",
        idEmpleado: null,
        insignia: null,
        razonRechazo: null
    },
    {
        id: "SOL-1234567892-TEST003",
        nombreCompleto: "Ana Torres Sánchez",
        fechaNacimiento: "1998-02-10",
        edad: 25,
        especialidad: "ciberseguridad",
        anosExperiencia: 2,
        habilidades: "Análisis de vulnerabilidades, Pentesting, Firewalls, IDS/IPS, OWASP",
        disponibilidad: ["medio-tiempo", "remoto", "freelance"],
        motivacion: "Especializada en seguridad ofensiva y defensiva, busco aplicar mis conocimientos en un equipo dinámico",
        estado: "pendiente",
        fechaSolicitud: "2024-01-23T16:45:00Z",
        idEmpleado: null,
        insignia: null,
        razonRechazo: null
    }
]));


/* 
   PASO 4: FUNCIONES ÚTILES PARA TESTING
   
   Ejecuta estas funciones en la consola para probar:
*/

// Ver todas las solicitudes
function verSolicitudes() {
    const solicitudes = JSON.parse(localStorage.getItem('solicitudesEquipo')) || [];
    console.table(solicitudes);
}

// Ver todos los empleados
function verEmpleados() {
    const empleados = JSON.parse(localStorage.getItem('empleados')) || [];
    console.table(empleados);
}

// Limpiar todos los datos (CUIDADO)
function limpiarDatos() {
    if (confirm('¿SEGURO que quieres eliminar TODOS los datos?')) {
        localStorage.removeItem('solicitudesEquipo');
        localStorage.removeItem('empleados');
        localStorage.removeItem('solicitudesBackup');
        alert('Datos eliminados');
    }
}

// Descargar datos como JSON
function descargarDatos() {
    const solicitudes = JSON.parse(localStorage.getItem('solicitudesEquipo')) || [];
    const empleados = JSON.parse(localStorage.getItem('empleados')) || [];
    
    const datos = {
        solicitudes: solicitudes,
        empleados: empleados,
        exportadoEl: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(datos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `reclutamiento-datos-${Date.now()}.json`;
    link.click();
}


/* 
   PASO 5: PERSONALIZACIÓN
   
   Para cambiar los colores, edita estos valores en css/reclutamiento.css y css/admin-panel.css:
*/




/* 
   PASO 6: PRÓXIMAS MEJORAS
   
   Aquí están las mejoras que puedes hacer:
*/

// 1. BACKEND INTEGRATION
//    - Crear API en tu servidor para guardar solicitudes
//    - Endpoints: POST /api/solicitudes, GET /api/solicitudes, etc
//    - Descomenta sendToServer() en reclutamiento.js

// 2. AUTENTICACIÓN
//    - Crear página de login para administradores
//    - Validar credenciales contra base de datos
//    - Usar tokens JWT para sesiones

// 3. NOTIFICACIONES
//    - Enviar emails cuando se envía una solicitud
//    - Notificar al administrador de nuevas solicitudes
//    - Enviar resultado (aceptado/rechazado) al candidato

// 4. DASHBOARD
//    - Crear dashboard con estadísticas
//    - Gráficos de solicitudes por mes
//    - Top especialidades solicitadas

// 5. PERFIL DE EMPLEADO
//    - Página donde empleados vean su perfil y rating
//    - Posibilidad de actualizar información
//    - Historial de trabajos completados


/* 
   PASO 7: VARIABLES DE ENTORNO (para integración posterior)
   
   Cuando integres con un servidor, usa estas variables:
*/

const CONFIG = {
    API_URL: 'https://tu-dominio.com/api',
    ADMIN_SECRET_KEY: 'tu-clave-secreta-aqui',
    MAX_FILE_UPLOAD_SIZE: 5242880, // 5MB
    SESSION_TIMEOUT: 3600000, // 1 hora en ms
    NOTIFICATION_EMAIL: 'admin@tu-dominio.com'
};


/* 
   PASO 8: TESTING CON INSOMNIA/POSTMAN
   
   Una vez tengas backend, puedes testear con estas requests:
*/

/*
POST /api/solicitudes
{
    "nombreCompleto": "Test User",
    "fechaNacimiento": "1995-01-15",
    "especialidad": "desarrollo-web",
    "anosExperiencia": 5,
    "habilidades": "JavaScript, React",
    "disponibilidad": ["tiempo-completo", "remoto"],
    "motivacion": "Test motivation"
}

GET /api/solicitudes?estado=pendiente
GET /api/solicitudes/:id
PUT /api/solicitudes/:id
{
    "estado": "aceptada"
}

DELETE /api/solicitudes/:id
*/


/* 
   PASO 9: CONTROL DE ACCESO AVANZADO
   
   Para un control más seguro, implementa esto:
*/

function setAdminWithPassword(password) {
    const correctPassword = 'tu-contraseña-aqui'; // CAMBIAR EN PRODUCCIÓN
    
    if (password === correctPassword) {
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('adminLoginTime', new Date().getTime());
        console.log('✓ Acceso de administrador habilitado');
        return true;
    } else {
        console.error('✗ Contraseña incorrecta');
        return false;
    }
}

function verificarSessionAdmin() {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const loginTime = parseInt(localStorage.getItem('adminLoginTime')) || 0;
    const sessionDuration = 3600000; // 1 hora
    const now = new Date().getTime();
    
    if (isAdmin && (now - loginTime) < sessionDuration) {
        return true;
    } else {
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('adminLoginTime');
        return false;
    }
}


/* 
   PASO 10: RESUMEN DE ARCHIVOS CREADOS
*/

/*
ARCHIVOS HTML:
- htmls/vacantes de trabajo.html      [ACTUALIZADO] - Página principal de solicitud
- htmls/admin-solicitudes.html        [NUEVO]      - Panel administrativo

ARCHIVOS CSS:
- htmls/css/reclutamiento.css         [NUEVO]      - Estilos de solicitud
- htmls/css/admin-panel.css           [NUEVO]      - Estilos del panel admin

ARCHIVOS JAVASCRIPT:
- htmls/javascript/reclutamiento.js   [NUEVO]      - Lógica de solicitud
- htmls/javascript/admin-panel.js     [NUEVO]      - Lógica del panel admin

DOCUMENTACIÓN:
- GUIA_RECLUTAMIENTO.md               [NUEVO]      - Guía completa de uso
- CONFIG-RAPIDA.js                    [ESTE ARCHIVO]

CARACTERÍSTICAS IMPLEMENTADAS:
✓ Formulario completo con validaciones
✓ Almacenamiento en localStorage
✓ Panel administrativo con tabs
✓ Aceptar/Rechazar solicitudes
✓ Generación automática de IDs de empleado
✓ Asignación de insignias
✓ Búsqueda y filtrado
✓ Diseño moderno con animaciones
✓ Colores personalizados
✓ Responsivo para móvil
✓ Sistema de empleados
*/

// ¡LISTO PARA USAR!
console.log('✓ Sistema de Reclutamiento listo para usar');
console.log('  - Pagina de solicitud: vacantes de trabajo.html');
console.log('  - Panel admin: admin-solicitudes.html');
console.log('  - Habilita admin con: localStorage.setItem("isAdmin", "true");');
