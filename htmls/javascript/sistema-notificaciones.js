/* =============================================
   SISTEMA DE NOTIFICACIONES
   ============================================= */

class SistemaNotificaciones {
    constructor() {
        this.notificacionesKey = 'notificaciones';
        this.inicializar();
    }

    inicializar() {
        if (!localStorage.getItem(this.notificacionesKey)) {
            localStorage.setItem(this.notificacionesKey, JSON.stringify([]));
        }
    }

    // Crear notificación
    crearNotificacion(datos) {
        const notificacion = {
            id: 'NOT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            para_usuario_id: datos.para_usuario_id,
            tipo: datos.tipo, // 'mensaje_nuevo', 'solicitud_empleado', 'solicitud_aprobada', etc
            de_usuario_id: datos.de_usuario_id || null,
            de_usuario_nombre: datos.de_usuario_nombre || 'Sistema',
            contenido: datos.contenido,
            enlace: datos.enlace || null,
            leida: false,
            fecha: new Date().toISOString()
        };

        const notificaciones = this.obtenerNotificaciones();
        notificaciones.push(notificacion);
        localStorage.setItem(this.notificacionesKey, JSON.stringify(notificaciones));

        return notificacion;
    }

    // Obtener notificaciones de un usuario
    obtenerNotificacionesUsuario(usuario_id) {
        const notificaciones = this.obtenerNotificaciones();
        return notificaciones
            .filter(n => n.para_usuario_id === usuario_id)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    // Obtener notificaciones no leídas
    obtenerNoLeidas(usuario_id) {
        const notificaciones = this.obtenerNotificacionesUsuario(usuario_id);
        return notificaciones.filter(n => !n.leida);
    }

    // Contar notificaciones no leídas
    contarNoLeidas(usuario_id) {
        return this.obtenerNoLeidas(usuario_id).length;
    }

    // Marcar como leída
    marcarComoLeida(notificacion_id) {
        const notificaciones = this.obtenerNotificaciones();
        const notificacion = notificaciones.find(n => n.id === notificacion_id);

        if (notificacion) {
            notificacion.leida = true;
            localStorage.setItem(this.notificacionesKey, JSON.stringify(notificaciones));
            return { exito: true };
        }

        return { error: 'Notificación no encontrada' };
    }

    // Marcar todas como leídas
    marcarTallasComoLeidas(usuario_id) {
        const notificaciones = this.obtenerNotificaciones();
        notificaciones.forEach(n => {
            if (n.para_usuario_id === usuario_id && !n.leida) {
                n.leida = true;
            }
        });
        localStorage.setItem(this.notificacionesKey, JSON.stringify(notificaciones));
        return { exito: true };
    }

    // Obtener todas las notificaciones
    obtenerNotificaciones() {
        const notificacionesStr = localStorage.getItem(this.notificacionesKey);
        return notificacionesStr ? JSON.parse(notificacionesStr) : [];
    }

    // Eliminar notificación
    eliminarNotificacion(notificacion_id) {
        const notificaciones = this.obtenerNotificaciones();
        const nuevas = notificaciones.filter(n => n.id !== notificacion_id);
        localStorage.setItem(this.notificacionesKey, JSON.stringify(nuevas));
        return { exito: true };
    }

    // Notificar a admin
    notificarAdmin(tipo, contenido, detalles = {}) {
        const admin = sistemaUsuarios.obtenerUsuariosPorRol('administrador')[0];
        
        if (admin) {
            this.crearNotificacion({
                para_usuario_id: admin.id,
                tipo: 'admin_' + tipo,
                contenido: contenido,
                enlace: detalles.enlace || null
            });
        }
    }

    // Obtener estadísticas de notificaciones para dashboard
    obtenerEstadisticasAdmin() {
        const admin = sistemaUsuarios.obtenerUsuarioActual();
        if (!admin || admin.rol !== 'administrador') {
            return null;
        }

        const noLeidas = this.obtenerNoLeidas(admin.id).length;
        const porTipo = {};

        this.obtenerNotificacionesUsuario(admin.id).forEach(n => {
            porTipo[n.tipo] = (porTipo[n.tipo] || 0) + 1;
        });

        return {
            totalNoLeidas: noLeidas,
            porTipo: porTipo,
            solicitudesEmpleoAprobadas: porTipo['admin_solicitud_aprobada'] || 0,
            solicitudesEmpleoRechazadas: porTipo['admin_solicitud_rechazada'] || 0,
            nuevosUsuarios: porTipo['admin_usuario_registrado'] || 0
        };
    }

    // Obtener todas las notificaciones
    obtenerNotificaciones() {
        return JSON.parse(localStorage.getItem(this.notificacionesKey) || '[]');
    }

    // Eliminar notificación
    eliminarNotificacion(notificacion_id) {
        const notificaciones = this.obtenerNotificaciones();
        const filtradas = notificaciones.filter(n => n.id !== notificacion_id);
        localStorage.setItem(this.notificacionesKey, JSON.stringify(filtradas));
    }
}

// Instancia global (nota: hay un typo en el nombre original "sistemaNotiicaciones")
const sistemaNotiicaciones = new SistemaNotificaciones();
const sistemaNotificaciones = sistemaNotiicaciones; // Alias correcto
