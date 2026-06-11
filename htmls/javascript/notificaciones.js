/* =============================================
   FUNCIONALIDAD DE NOTIFICACIONES
   ============================================= */

let filtroActual = 'todas';

document.addEventListener('DOMContentLoaded', async function() {
    if (window.sessionSyncPromise) await window.sessionSyncPromise;
    if (!verificarSesion()) return;
    cargarNotificaciones();
});

/* ==================== CARGAR NOTIFICACIONES ==================== */

function cargarNotificaciones() {
    const usuarioActual = sistemaUsuarios.obtenerUsuarioActual();
    const notificaciones = sistemaNotiicaciones.obtenerNotificacionesUsuario(usuarioActual.id);
    const container = document.getElementById('notificationList');

    const notificacionesFiltradas = notificaciones.filter(n => {
        if (filtroActual === 'todas') return true;
        if (filtroActual === 'mensajes') return n.tipo === 'mensaje_nuevo';
        if (filtroActual === 'sistema') return !n.tipo.startsWith('admin_') && n.tipo !== 'mensaje_nuevo';
        if (filtroActual === 'admin') return n.tipo.startsWith('admin_');
        return true;
    });

    container.innerHTML = '';

    if (notificacionesFiltradas.length === 0) {
        container.innerHTML = `
            <div class="notification-empty">
                <div class="notification-empty-icon">📭</div>
                <p>No hay notificaciones</p>
            </div>
        `;
        return;
    }

    notificacionesFiltradas.forEach(notificacion => {
        const item = crearElementoNotificacion(notificacion);
        container.appendChild(item);
    });
}

/* ==================== CREAR ELEMENTO DE NOTIFICACIÓN ==================== */

function crearElementoNotificacion(notificacion) {
    const div = document.createElement('div');
    div.className = 'notification-item' + (notificacion.leida ? '' : ' no-leida');

    const tipoLabel = getTipoLabel(notificacion.tipo);
    const tiempo = haceCuantoTiempo(notificacion.fecha);

    div.innerHTML = `
        <div class="notification-item-header">
            <div>
                <div class="notification-item-title">${getTituloNotificacion(notificacion)}</div>
                <div class="notification-item-tipo">${tipoLabel}</div>
            </div>
        </div>

        <div class="notification-item-content">
            ${notificacion.contenido}
        </div>

        <div class="notification-item-fecha">${tiempo}</div>

        ${notificacion.enlace ? `
            <div class="notification-item-acciones">
                <a href="${notificacion.enlace}" class="notification-btn notification-btn-primary">Ver</a>
                <button onclick="eliminarNotificacion('${notificacion.id}')" class="notification-btn notification-btn-secondary">Descartar</button>
            </div>
        ` : `
            <div class="notification-item-acciones">
                <button onclick="eliminarNotificacion('${notificacion.id}')" class="notification-btn notification-btn-secondary">Descartar</button>
            </div>
        `}
    `;

    // Marcar como leída al hacer click
    if (!notificacion.leida) {
        div.addEventListener('click', () => {
            sistemaNotiicaciones.marcarComoLeida(notificacion.id);
            div.classList.remove('no-leida');
            actualizarBadgesNotificaciones();
        });
    }

    return div;
}

/* ==================== UTILIDADES ==================== */

function getTituloNotificacion(notificacion) {
    const titulos = {
        'mensaje_nuevo': `Mensaje de ${notificacion.de_usuario_nombre}`,
        'empleado_aprobado': 'Felicidades',
        'empleado_destituido': 'Cambio de estado',
        'solicitud_rechazada': 'Solicitud rechazada',
        'solicitud_aprobada': 'Solicitud aprobada',
        'admin_solicitud_empleo': 'Nueva solicitud de empleo',
        'admin_usuario_registrado': 'Nuevo usuario registrado'
    };

    return titulos[notificacion.tipo] || 'Notificación';
}

function getTipoLabel(tipo) {
    const labels = {
        'mensaje_nuevo': '💬 Mensaje',
        'empleado_aprobado': '✓ Aprobado',
        'empleado_destituido': '⚠️ Cambio',
        'solicitud_rechazada': '✗ Rechazada',
        'solicitud_aprobada': '✓ Aprobada',
        'admin_solicitud_empleo': '📋 Solicitud',
        'admin_usuario_registrado': '👤 Usuario'
    };

    return labels[tipo] || 'Notificación';
}

/* ==================== ACCIONES ==================== */

function filtrarNotificaciones(filtro) {
    filtroActual = filtro;

    // Actualizar botones
    document.querySelectorAll('.notification-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Recargar
    cargarNotificaciones();
}

function eliminarNotificacion(notificacion_id) {
    sistemaNotiicaciones.eliminarNotificacion(notificacion_id);
    mostrarToast('Notificación eliminada', 'exito');
    cargarNotificaciones();
    actualizarBadgesNotificaciones();
}

function marcarTallasComoLeidas() {
    const usuarioActual = sistemaUsuarios.obtenerUsuarioActual();
    sistemaNotiicaciones.marcarTallasComoLeidas(usuarioActual.id);
    mostrarToast('Todas marcadas como leídas', 'exito');
    cargarNotificaciones();
    actualizarBadgesNotificaciones();
}

function limpiarNotificaciones() {
    if (!confirmar('¿Estás seguro de que deseas eliminar todas las notificaciones?')) {
        return;
    }

    const usuarioActual = sistemaUsuarios.obtenerUsuarioActual();
    const notificaciones = sistemaNotiicaciones.obtenerNotificacionesUsuario(usuarioActual.id);

    notificaciones.forEach(n => {
        sistemaNotiicaciones.eliminarNotificacion(n.id);
    });

    mostrarToast('Notificaciones eliminadas', 'exito');
    cargarNotificaciones();
    actualizarBadgesNotificaciones();
}

// Hacer funciones globales
window.filtrarNotificaciones = filtrarNotificaciones;
window.eliminarNotificacion = eliminarNotificacion;
window.marcarTallasComoLeidas = marcarTallasComoLeidas;
window.limpiarNotificaciones = limpiarNotificaciones;
