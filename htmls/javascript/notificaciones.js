/* =============================================
   FUNCIONALIDAD DE NOTIFICACIONES
   ============================================= */

let filtroActual = 'todas';

document.addEventListener('DOMContentLoaded', async function() {
    if (window.sessionSyncPromise) await window.sessionSyncPromise;
    if (!window.__currentUser) {
        window.location.href = 'login.html';
        return;
    }
    cargarNotificaciones();
});

/* ==================== CARGA DE NOTIFICACIONES DESDE EL BACKEND ==================== */

async function fetchNotificaciones() {
    const response = await apiFetch('/api/notificaciones');
    if (!response.ok) {
        console.error('Error al obtener notificaciones desde backend', response.status);
        return [];
    }
    const data = await response.json().catch(() => null);
    const notis = Array.isArray(data && data.notificaciones) ? data.notificaciones : [];
    console.log('NOTIFICACIONES RECIBIDAS:', notis);
    return notis;
}

async function cargarNotificaciones() {
    const notificaciones = await fetchNotificaciones();
    const container = document.getElementById('notificationList');

    const notificacionesFiltradas = notificaciones.filter(n => {
        const tipo = inferNotificationTipo(n);
        if (filtroActual === 'todas') return true;
        if (filtroActual === 'mensajes') return tipo === 'mensaje_nuevo';
        if (filtroActual === 'sistema') return tipo === 'sistema';
        if (filtroActual === 'admin') return tipo.startsWith('admin_') || tipo === 'admin_info';
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
    const tipo = inferNotificationTipo(notificacion);
    const div = document.createElement('div');
    div.className = 'notification-item' + (notificacion.leida ? '' : ' no-leida');

    const tipoLabel = getTipoLabel(tipo);
    const tiempo = haceCuantoTiempo(notificacion.fecha_notificacion || notificacion.fecha);
    const contenido = notificacion.mensaje || notificacion.contenido || '';

    div.innerHTML = `
        <div class="notification-item-header">
            <div>
                <div class="notification-item-title">${getTituloNotificacion(tipo, contenido)}</div>
                <div class="notification-item-tipo">${tipoLabel}</div>
            </div>
        </div>

        <div class="notification-item-content">
            ${contenido}
        </div>

        <div class="notification-item-fecha">${tiempo}</div>

        <div class="notification-item-acciones">
            <button onclick="eliminarNotificacion(${notificacion.id_notificacion || JSON.stringify(notificacion.id)})" class="notification-btn notification-btn-secondary">Marcar como leída</button>
        </div>
    `;

    if (!notificacion.leida) {
        div.addEventListener('click', async (event) => {
            if (event.target.closest('button')) return;
            await marcarNotificacionComoLeida(notificacion.id_notificacion || notificacion.id);
            div.classList.remove('no-leida');
            actualizarBadgesNotificaciones();
        });
    }

    return div;
}

/* ==================== UTILIDADES ==================== */

function inferNotificationTipo(notificacion) {
    const texto = (notificacion.mensaje || '').toLowerCase();
    if (texto.includes('nuevo mensaje') || texto.includes('mensaje de')) return 'mensaje_nuevo';
    if (texto.includes('solicitud de empleo') || texto.includes('nueva solicitud')) return 'admin_solicitud_empleo';
    if (texto.includes('solicitud fue aprobada') || texto.includes('aprobada') && texto.includes('solicitud')) return 'solicitud_aprobada';
    if (texto.includes('solicitud fue rechazada') || texto.includes('rechazada')) return 'solicitud_rechazada';
    if (texto.includes('solicitud') && texto.includes('información')) return 'admin_info';
    if (texto.includes('empleado') && texto.includes('aprobada')) return 'empleado_aprobado';
    return 'sistema';
}

function getTituloNotificacion(tipo, contenido) {
    const titulos = {
        'mensaje_nuevo': 'Nuevo mensaje',
        'empleado_aprobado': '¡Solicitud aprobada!',
        'empleado_destituido': 'Cambio de estado',
        'solicitud_rechazada': 'Solicitud rechazada',
        'solicitud_aprobada': 'Solicitud aprobada',
        'admin_solicitud_empleo': 'Nueva solicitud de empleo',
        'admin_usuario_registrado': 'Nuevo usuario registrado',
        'admin_info': 'Solicitud: se necesita información'
    };

    return titulos[tipo] || contenido.substring(0, 40) || 'Notificación';
}

function getTipoLabel(tipo) {
    const labels = {
        'mensaje_nuevo': '💬 Mensaje',
        'empleado_aprobado': '✓ Aprobada',
        'empleado_destituido': '⚠️ Cambio',
        'solicitud_rechazada': '✗ Rechazada',
        'solicitud_aprobada': '✓ Aprobada',
        'admin_solicitud_empleo': '📋 Solicitud',
        'admin_usuario_registrado': '👤 Usuario',
        'admin_info': '❓ Info requerida',
        'sistema': '🔔 Sistema'
    };
    return labels[tipo] || 'Notificación';
}

/* ==================== ACCIONES ==================== */

async function filtrarNotificaciones(filtro, event) {
    filtroActual = filtro;

    document.querySelectorAll('.notification-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    await cargarNotificaciones();
}

async function marcarNotificacionComoLeida(notificacionId) {
    await apiFetch(`/api/notificaciones/${notificacionId}/read`, { method: 'PUT' });
    await cargarNotificaciones();
    actualizarBadgesNotificaciones();
}

async function eliminarNotificacion(notificacion_id) {
    await marcarNotificacionComoLeida(notificacion_id);
    mostrarToast('Notificación marcada como leída', 'exito');
}

async function marcarTallasComoLeidas() {
    await apiFetch('/api/notificaciones/clear', { method: 'DELETE' });
    mostrarToast('Todas marcadas como leídas', 'exito');
    await cargarNotificaciones();
    actualizarBadgesNotificaciones();
}

async function limpiarNotificaciones() {
    if (!await confirmar('¿Estás seguro de que deseas marcar todas las notificaciones como leídas?')) {
        return;
    }

    await apiFetch('/api/notificaciones/clear', { method: 'DELETE' });
    mostrarToast('Notificaciones actualizadas', 'exito');
    await cargarNotificaciones();
    actualizarBadgesNotificaciones();
}

window.filtrarNotificaciones = filtrarNotificaciones;
window.eliminarNotificacion = eliminarNotificacion;
window.marcarTallasComoLeidas = marcarTallasComoLeidas;
window.limpiarNotificaciones = limpiarNotificaciones;
