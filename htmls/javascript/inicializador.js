/* =============================================
   INICIALIZADOR GLOBAL DEL SISTEMA
   ============================================= */

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    inicializarSistema();
});

// Helper para obtener texto crudo y parsear JSON con logging
async function fetchAndParse(path, options = {}) {
    const resp = await apiFetch(path, options);
    let text = '';
    try { text = await resp.text(); } catch (e) { text = ''; }
    console.log('RESPUESTA CRUDA (fetchAndParse):', path, text);
    let data = null;
    try { if (text) data = JSON.parse(text); } catch (e) { console.warn('JSON parse error for', path, e); }
    return { resp, data };
}

function inicializarSistema() {
    window.sessionSyncPromise = window.sessionSyncPromise || syncSessionState();

    // Actualizar UI del header
    actualizarHeaderUI();
    
    // Actualizar badges de notificaciones
    actualizarBadgesNotificaciones();
    
    // Actualizar cada 5 segundos
    setInterval(actualizarBadgesNotificaciones, 5000);
    
    // Event listeners para logout
    const navLogout = document.getElementById('navLogout');
    if (navLogout) {
        navLogout.addEventListener('click', handleLogoutClick);
    }
}

/* ==================== ACTUALIZAR UI DEL HEADER ==================== */

function actualizarHeaderUI() {
    const navAdmin = document.getElementById('navAdmin');
    const navLogout = document.getElementById('navLogout');
    const navMensajes = document.getElementById('navMensajes');
    const navNotificaciones = document.getElementById('navNotificaciones');

    if (navLogout) navLogout.style.display = 'none';
    if (navMensajes) navMensajes.style.display = 'none';
    if (navNotificaciones) navNotificaciones.style.display = 'none';
    if (navAdmin) navAdmin.style.display = 'none';

    const showHeaderForUser = (usuarioActual) => {
        console.log('USUARIO SESION (showHeaderForUser):', usuarioActual);
        if (!usuarioActual) return;

        if (navLogout) navLogout.style.display = 'inline-block';
        if (navMensajes) navMensajes.style.display = 'inline-block';
        if (navNotificaciones) navNotificaciones.style.display = 'inline-block';

        try {
            console.log('ROL DETECTADO:', usuarioActual.rol);
            console.log('NAV ADMIN elemento:', navAdmin);
        } catch (e) {
            console.warn('Error al loggear usuario/rol:', e);
        }

        // Mostrar el enlace de admin solo si el backend indica rol admin
        if (usuarioActual.rol && (usuarioActual.rol.toLowerCase() === 'administrador' || usuarioActual.rol.toLowerCase() === 'admin')) {
            if (navAdmin) navAdmin.style.display = 'inline-block';
        } else {
            if (navAdmin) navAdmin.style.display = 'none';
        }
    };

    const sessionPromise = window.sessionSyncPromise || syncSessionState();
    sessionPromise.then(showHeaderForUser).catch(() => {
        // No session, keep nav hidden
    });
}

/* ==================== ACTUALIZAR BADGES ==================== */

function actualizarBadgesNotificaciones() {
    const sessionPromise = window.sessionSyncPromise || syncSessionState();

    sessionPromise.then(sessionUser => {
        if (!sessionUser) return;

        const badgeMensajes = document.getElementById('badgeMensajes');
        const badgeNotificaciones = document.getElementById('badgeNotificaciones');

        (async () => {
            try {
                const { resp, data } = await fetchAndParse('/api/notificaciones');
                const notificaciones = data && Array.isArray(data.notificaciones) ? data.notificaciones : [];
                console.log('NOTIFICACIONES RECIBIDAS:', notificaciones);
                const noLeidas = notificaciones.filter(n => !n.leida).length;
                if (badgeNotificaciones) {
                    if (noLeidas > 0) {
                        badgeNotificaciones.textContent = noLeidas;
                        badgeNotificaciones.style.display = 'flex';
                    } else {
                        badgeNotificaciones.style.display = 'none';
                    }
                }
            } catch (e) {
                if (badgeNotificaciones) badgeNotificaciones.style.display = 'none';
            }
        })();

        (async () => {
            try {
                const { resp, data } = await fetchAndParse('/api/mensajes/conversations');
                const mensajes = data && Array.isArray(data.mensajes) ? data.mensajes : [];
                console.log('MENSAJES RECIBIDOS:', mensajes);
                const noLeidos = mensajes.filter(msg => msg.destinatario_id === sessionUser.id && !msg.leido).length;
                if (badgeMensajes) {
                    if (noLeidos > 0) {
                        badgeMensajes.textContent = noLeidos;
                        badgeMensajes.style.display = 'flex';
                    } else {
                        badgeMensajes.style.display = 'none';
                    }
                }
                console.log('BADGES ACTUALIZADOS');
            } catch (e) {
                if (badgeMensajes) badgeMensajes.style.display = 'none';
            }
        })();
    }).catch(() => {
        const badgeMensajes = document.getElementById('badgeMensajes');
        const badgeNotificaciones = document.getElementById('badgeNotificaciones');
        if (badgeMensajes) badgeMensajes.style.display = 'none';
        if (badgeNotificaciones) badgeNotificaciones.style.display = 'none';
    });
}

/* ==================== LOGOUT ==================== */

function handleLogoutClick(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    if (confirm('¿Deseas cerrar sesión?')) {
        if (typeof window.logout === 'function') {
            window.logout(e);
        }
    }
}

/* ==================== FUNCIONES AUXILIARES ==================== */

function clearLocalSession() {
    localStorage.removeItem('usuarioActual');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('usuarioLogueado');
}

async function syncSessionState() {
    try {
        const data = await getSession();
        console.log('syncSessionState - /api/session response:', data);
        if (data && data.user) {
            window.setCurrentUser(data.user);
            return data.user;
        }
    } catch (err) {
        console.warn('No se pudo sincronizar sesión:', err);
    }

    clearLocalSession();
    return null;
}

// Verificar si usuario está logueado
function verificarSesion() {
    const usuarioActual = sistemaUsuarios.obtenerUsuarioActual();
    if (!usuarioActual) {
        console.log('REDIRECCION DETECTADA');
        console.log('Archivo: inicializador.js');
        console.log('Motivo: verificarSesion sin usuario local');
        console.log('Usuario:', usuarioActual);
        console.log('Sesion: localStorage.usuarioActual no existe');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Verificar si es administrador
function verificarAdmin() {
    const usuarioActual = sistemaUsuarios.obtenerUsuarioActual();
    if (!usuarioActual || !(usuarioActual.rol && (usuarioActual.rol.toLowerCase() === 'administrador' || usuarioActual.rol.toLowerCase() === 'admin'))) {
        console.log('REDIRECCION DETECTADA');
        console.log('Archivo: inicializador.js');
        console.log('Motivo: verificarAdmin falló');
        console.log('Usuario:', usuarioActual);
        console.log('Sesion: admin requerida');
        alert('Acceso denegado. Solo administradores pueden acceder.');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Formatear fecha
function formatearFecha(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Formatear fecha y hora
function formatearFechaHora(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Formatear hace cuánto tiempo
function haceCuantoTiempo(dateString) {
    const date = new Date(dateString);
    const ahora = new Date();
    const diferencia = ahora - date;
    
    const segundos = Math.floor(diferencia / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (segundos < 60) return 'Hace unos segundos';
    if (minutos < 60) return `Hace ${minutos}m`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias < 7) return `Hace ${dias}d`;
    
    return formatearFecha(dateString);
}

// Crear elemento HTML seguro
function crearElemento(tag, clase = '', contenido = '') {
    const elemento = document.createElement(tag);
    if (clase) elemento.className = clase;
    if (contenido) elemento.innerHTML = contenido;
    return elemento;
}

// Mostrar toast de notificación
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'exito' ? '#10B981' : tipo === 'error' ? '#EF4444' : '#7C3AED'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        font-weight: 600;
    `;
    toast.textContent = mensaje;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Confirmación personalizada
async function confirmar(mensaje) {
    return confirm(mensaje);
}

// Obtener parámetros de URL
function obtenerParametroURL(nombre) {
    const params = new URLSearchParams(window.location.search);
    return params.get(nombre);
}

// Enviar parámetro de URL
function irCon(url, parametro, valor) {
    const params = new URLSearchParams();
    params.set(parametro, valor);
    window.location.href = `${url}?${params.toString()}`;
}

/* ==================== VALIDACIÓN DE FORMULARIOS ==================== */

/* ==================== VALIDACIÓN DE FORMULARIOS ==================== */

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validarContraseña(password) {
    return password.length >= 6;
}

/* ==================== HERRAMIENTAS DE DEPURACIÓN ==================== */

// Función para verificar el estado de la sesión en la consola
function debugSesion() {
    console.group('🔍 DEBUG - Estado de Sesión');
    console.log('localStorage.usuarioActual:', localStorage.getItem('usuarioActual'));
    console.log('localStorage.sessionToken:', localStorage.getItem('sessionToken'));
    console.log('sistemaUsuarios.obtenerUsuarioActual():', sistemaUsuarios.obtenerUsuarioActual());
    console.log('localStorage completo:', localStorage);
    console.groupEnd();
}

// Función para verificar todos los usuarios
function debugUsuarios() {
    console.group('🔍 DEBUG - Todos los Usuarios');
    const usuarios = sistemaUsuarios.obtenerUsuarios();
    console.log('Total de usuarios:', usuarios.length);
    console.table(usuarios.map(u => ({ id: u.id, usuario: u.nombre_usuario, rol: u.rol, estado: u.estado })));
    console.groupEnd();
}

// Función para ver toda la estructura de datos
function debugDatos() {
    console.group('🔍 DEBUG - Estructura Completa de Datos');
    console.log('=== USUARIOS ===');
    console.table(sistemaUsuarios.obtenerUsuarios());
    console.log('\n=== USUARIO ACTUAL ===');
    console.log(sistemaUsuarios.obtenerUsuarioActual());
    console.log('\n=== EMPLEADOS ===');
    console.table(sistemaEmpleados.obtenerEmpleados());
    console.log('\n=== SOLICITUDES ===');
    console.table(sistemaSolicitudesEmpleo.obtenerSolicitudes());
    console.groupEnd();
}

// Exponer funciones de debug al window
window.debugSesion = debugSesion;
window.debugUsuarios = debugUsuarios;
window.debugDatos = debugDatos;

console.log('%c✓ Sistema de Depuración Cargado', 'color: green; font-weight: bold;');
console.log('%cComandos disponibles:', 'color: cyan;');
console.log('  • debugSesion() - Ver estado de la sesión actual');
console.log('  • debugUsuarios() - Ver todos los usuarios registrados');
console.log('  • debugDatos() - Ver toda la estructura de datos del sistema');

// Hacer funciones globales
window.inicializarSistema = inicializarSistema;
window.actualizarHeaderUI = actualizarHeaderUI;
window.actualizarBadgesNotificaciones = actualizarBadgesNotificaciones;
window.verificarSesion = verificarSesion;
window.verificarAdmin = verificarAdmin;
window.formatearFecha = formatearFecha;
window.formatearFechaHora = formatearFechaHora;
window.haceCuantoTiempo = haceCuantoTiempo;
window.mostrarToast = mostrarToast;
window.validarEmail = validarEmail;
window.validarContraseña = validarContraseña;
