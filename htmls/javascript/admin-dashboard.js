/* =============================================
   FUNCIONALIDAD DEL PANEL ADMINISTRATIVO
   ============================================= */

document.addEventListener('DOMContentLoaded', async function() {
    if (window.sessionSyncPromise) await window.sessionSyncPromise;
    if (!verificarAdmin()) return;
    cargarEstadisticas();
});

/* ==================== CARGAR ESTADÍSTICAS ==================== */

function cargarEstadisticas() {
    const container = document.getElementById('adminStats');
    
    // Obtener datos
    const usuarios = sistemaUsuarios.obtenerUsuarios();
    const empleados = sistemaEmpleados.obtenerEmpleados();
    const solicitudes = sistemaSolicitudesEmpleo.obtenerSolicitudes();
    const notificaciones = sistemaNotiicaciones.obtenerNotificacionesUsuario(
        sistemaUsuarios.obtenerUsuarioActual().id
    );

    // Calcular estadísticas
    const stats = {
        usuarios: usuarios.length,
        usuariosActivos: usuarios.filter(u => u.estado === 'activo').length,
        empleados: empleados.length,
        solicitudesPendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
        notificacionesNoLeidas: notificaciones.filter(n => !n.leida).length
    };

    // Crear tarjetas
    const statsHTML = `
        <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-numero">${stats.usuarios}</div>
            <div class="stat-label">Usuarios Totales</div>
            <div style="font-size: 0.85rem; color: var(--color-verde); margin-top: 5px;">${stats.usuariosActivos} activos</div>
        </div>

        <div class="stat-card">
            <div class="stat-icon">🏢</div>
            <div class="stat-numero">${stats.empleados}</div>
            <div class="stat-label">Empleados Verificados</div>
        </div>

        <div class="stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-numero">${stats.solicitudesPendientes}</div>
            <div class="stat-label">Solicitudes Pendientes</div>
            <div style="font-size: 0.85rem; color: var(--color-rojo); margin-top: 5px;">Requieren atención</div>
        </div>

        <div class="stat-card">
            <div class="stat-icon">🔔</div>
            <div class="stat-numero">${stats.notificacionesNoLeidas}</div>
            <div class="stat-label">Notificaciones No Leídas</div>
        </div>
    `;

    container.innerHTML = statsHTML;
}

/* ==================== UTILIDADES ==================== */

function irA(url) {
    window.location.href = url;
}

function exportarHistorial() {
    sistemaHistorial.exportarHistorial();
    mostrarToast('Historial exportado', 'exito');
}

function exportarDatos() {
    const usuarioActual = sistemaUsuarios.obtenerUsuarioActual();
    
    const datos = {
        usuarios: sistemaUsuarios.obtenerUsuarios(),
        empleados: sistemaEmpleados.obtenerEmpleados(),
        solicitudesEmpleo: sistemaSolicitudesEmpleo.obtenerSolicitudes(),
        notificaciones: sistemaNotiicaciones.obtenerNotificaciones(),
        historial: sistemaHistorial.obtenerHistorial(),
        exportadoPor: usuarioActual.nombre_usuario,
        fecha: new Date().toISOString()
    };

    const dataStr = JSON.stringify(datos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `datos-plataforma-${Date.now()}.json`;
    link.click();

    mostrarToast('Datos exportados', 'exito');
}

function limpiarDatos() {
    if (!confirmar('⚠️ ¿ESTÁS SEGURO? Esto eliminará TODOS los datos del sistema.\n\nEscribe "CONFIRMAR" para proceder:')) {
        return;
    }

    // Solicitar confirmación adicional
    const confirmacion = prompt('Escribe "CONFIRMAR" para proceder:');
    if (confirmacion !== 'CONFIRMAR') {
        mostrarToast('Operación cancelada', 'error');
        return;
    }

    // Limpiar
    localStorage.removeItem('usuarios');
    localStorage.removeItem('empleados');
    localStorage.removeItem('solicitudesEmpleo');
    localStorage.removeItem('mensajes');
    localStorage.removeItem('notificaciones');
    localStorage.removeItem('historialAdmin');
    
    mostrarToast('Todos los datos han sido eliminados', 'exito');
    setTimeout(() => window.location.reload(), 1000);
}

// Hacer funciones globales
window.cargarEstadisticas = cargarEstadisticas;
window.irA = irA;
window.exportarHistorial = exportarHistorial;
window.exportarDatos = exportarDatos;
window.limpiarDatos = limpiarDatos;
