/* =============================================
   SISTEMA DE SOLICITUDES DE EMPLEO
   ============================================= */

class SistemaSolicitudesEmpleo {
    constructor() {
        this.solicitudesKey = 'solicitudesEmpleo';
        this.inicializar();
    }

    inicializar() {
        if (!localStorage.getItem(this.solicitudesKey)) {
            localStorage.setItem(this.solicitudesKey, JSON.stringify([]));
        }
    }

    // Crear solicitud (desde reclutamiento.js)
    crearSolicitud(datos) {
        const solicitud = {
            id: 'SOL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            usuario_id: datos.usuario_id || null,
            nombreCompleto: datos.nombreCompleto,
            email: datos.email || null,
            especialidad: datos.especialidad,
            anosExperiencia: datos.anosExperiencia,
            habilidades: datos.habilidades,
            disponibilidad: datos.disponibilidad,
            motivacion: datos.motivacion,
            estado: 'pendiente', // pendiente, aceptada, rechazada
            fechaSolicitud: new Date().toISOString(),
            motivoRechazo: null,
            fechaRevision: null,
            revisadoPor: null
        };

        const solicitudes = this.obtenerSolicitudes();
        solicitudes.push(solicitud);
        localStorage.setItem(this.solicitudesKey, JSON.stringify(solicitudes));

        // Notificar a admin
        sistemaNotiicaciones.notificarAdmin('solicitud_empleo', 
            `Nueva solicitud de empleo: ${solicitud.nombreCompleto}`,
            { enlace: '/admin-empleados.html' }
        );

        // Historial
        sistemaHistorial.registrarAccion({
            accion: 'solicitud_empleo_creada',
            detalles: `Nueva solicitud de empleo: ${solicitud.nombreCompleto}`
        });

        return solicitud;
    }

    // Aprobar solicitud
    aprobarSolicitud(solicitud_id) {
        const solicitudes = this.obtenerSolicitudes();
        const solicitud = solicitudes.find(s => s.id === solicitud_id);

        if (!solicitud) {
            return { error: 'Solicitud no encontrada' };
        }

        const usuarioActual = sistemaUsuarios.obtenerUsuarioActual();
        solicitud.estado = 'aceptada';
        solicitud.fechaRevision = new Date().toISOString();
        solicitud.revisadoPor = usuarioActual ? usuarioActual.id : 'SISTEMA';

        localStorage.setItem(this.solicitudesKey, JSON.stringify(solicitudes));

        // Convertir a empleado si existe el usuario
        if (solicitud.usuario_id) {
            const usuario = sistemaUsuarios.obtenerUsuarioPorId(solicitud.usuario_id);
            if (usuario) {
                sistemaEmpleados.convertirAEmpleado(solicitud.usuario_id, {
                    especialidad: solicitud.especialidad,
                    anosExperiencia: solicitud.anosExperiencia
                });
            }
        }

        // Historial
        sistemaHistorial.registrarAccion({
            accion: 'solicitud_aprobada',
            detalles: `Solicitud aprobada: ${solicitud.nombreCompleto}`
        });

        return { exito: true, solicitud };
    }

    // Rechazar solicitud
    rechazarSolicitud(solicitud_id, motivo) {
        const solicitudes = this.obtenerSolicitudes();
        const solicitud = solicitudes.find(s => s.id === solicitud_id);

        if (!solicitud) {
            return { error: 'Solicitud no encontrada' };
        }

        const usuarioActual = sistemaUsuarios.obtenerUsuarioActual();
        solicitud.estado = 'rechazada';
        solicitud.motivoRechazo = motivo;
        solicitud.fechaRevision = new Date().toISOString();
        solicitud.revisadoPor = usuarioActual ? usuarioActual.id : 'SISTEMA';

        localStorage.setItem(this.solicitudesKey, JSON.stringify(solicitudes));

        // Notificar al usuario si existe
        if (solicitud.usuario_id) {
            sistemaNotiicaciones.crearNotificacion({
                para_usuario_id: solicitud.usuario_id,
                tipo: 'solicitud_rechazada',
                contenido: `Tu solicitud ha sido rechazada: ${motivo}`
            });
        }

        // Historial
        sistemaHistorial.registrarAccion({
            accion: 'solicitud_rechazada',
            usuarioAfectado: solicitud.usuario_id,
            detalles: `Solicitud rechazada: ${solicitud.nombreCompleto}. Motivo: ${motivo}`
        });

        return { exito: true, solicitud };
    }

    // Obtener solicitudes
    obtenerSolicitudes() {
        const solicitudesStr = localStorage.getItem(this.solicitudesKey);
        return solicitudesStr ? JSON.parse(solicitudesStr) : [];
    }

    // Obtener solicitudes pendientes
    obtenerPendientes() {
        return this.obtenerSolicitudes().filter(s => s.estado === 'pendiente');
    }

    // Obtener solicitud por ID
    obtenerSolicitudPorId(id) {
        return this.obtenerSolicitudes().find(s => s.id === id);
    }

    // Contar solicitudes pendientes
    contarPendientes() {
        return this.obtenerPendientes().length;
    }

    // Obtener solicitudes de usuario
    obtenerSolicitudesUsuario(usuario_id) {
        return this.obtenerSolicitudes().filter(s => s.usuario_id === usuario_id);
    }

    // Búsqueda y filtrado
    buscarSolicitudes(termino) {
        const solicitudes = this.obtenerSolicitudes();
        return solicitudes.filter(s => 
            s.nombreCompleto.toLowerCase().includes(termino.toLowerCase()) ||
            s.especialidad.toLowerCase().includes(termino.toLowerCase())
        );
    }

    // Obtener estadísticas
    obtenerEstadisticas() {
        const solicitudes = this.obtenerSolicitudes();

        return {
            total: solicitudes.length,
            pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
            aceptadas: solicitudes.filter(s => s.estado === 'aceptada').length,
            rechazadas: solicitudes.filter(s => s.estado === 'rechazada').length,
            porEspecialidad: this.contarPorEspecialidad()
        };
    }

    // Contar por especialidad
    contarPorEspecialidad() {
        const solicitudes = this.obtenerSolicitudes();
        const conteo = {};

        solicitudes.forEach(s => {
            conteo[s.especialidad] = (conteo[s.especialidad] || 0) + 1;
        });

        return conteo;
    }
}

// Instancia global
const sistemaSolicitudesEmpleo = new SistemaSolicitudesEmpleo();
