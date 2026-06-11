/* =============================================
   SISTEMA DE ADMINISTRACIÓN DE EMPLEADOS
   ============================================= */

class SistemaEmpleados {
    constructor() {
        this.empleadosKey = 'empleados';
        this.inicializar();
    }

    inicializar() {
        if (!localStorage.getItem(this.empleadosKey)) {
            localStorage.setItem(this.empleadosKey, JSON.stringify([]));
        }
    }

    // Convertir usuario en empleado
    convertirAEmpleado(usuario_id, datos) {
        const usuario = sistemaUsuarios.obtenerUsuarioPorId(usuario_id);
        if (!usuario) {
            return { error: 'Usuario no encontrado' };
        }

        const empleados = this.obtenerEmpleados();
        
        // Verificar que no ya sea empleado
        if (empleados.some(e => e.usuario_id === usuario_id)) {
            return { error: 'El usuario ya es empleado' };
        }

        const nuevoEmpleado = {
            id: 'EMP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            usuario_id: usuario_id,
            nombre: usuario.nombreCompleto,
            nombre_usuario: usuario.nombre_usuario,
            foto: usuario.foto,
            especialidad: datos.especialidad || usuario.especialidad,
            anosExperiencia: datos.anosExperiencia || usuario.anosExperiencia,
            insignia: 'empleado-verificado-' + usuario_id,
            estado: 'activo',
            fechaIngreso: new Date().toISOString(),
            rating: 5.0,
            certificaciones: datos.certificaciones || [],
            descripcion: datos.descripcion || usuario.descripcion
        };

        empleados.push(nuevoEmpleado);
        localStorage.setItem(this.empleadosKey, JSON.stringify(empleados));

        // Actualizar rol del usuario
        sistemaUsuarios.actualizarPerfil(usuario_id, { rol: 'empleado' });

        // Crear notificación
        sistemaNotiicaciones.crearNotificacion({
            para_usuario_id: usuario_id,
            tipo: 'empleado_aprobado',
            contenido: `¡Felicidades! Has sido aprobado como empleado del equipo técnico`,
            enlace: '/perfil.html'
        });

        // Historial
        sistemaHistorial.registrarAccion({
            accion: 'empleado_aprobado',
            usuarioAfectado: usuario_id,
            detalles: `Convertido a empleado. Especialidad: ${nuevoEmpleado.especialidad}`
        });

        return { exito: true, empleado: nuevoEmpleado };
    }

    // Destituir empleado
    destituurEmpleado(empleado_id) {
        const empleados = this.obtenerEmpleados();
        const empleado = empleados.find(e => e.id === empleado_id);

        if (!empleado) {
            return { error: 'Empleado no encontrado' };
        }

        const usuarioId = empleado.usuario_id;
        
        // Remover de empleados
        empleados.splice(empleados.indexOf(empleado), 1);
        localStorage.setItem(this.empleadosKey, JSON.stringify(empleados));

        // Revertir rol
        sistemaUsuarios.actualizarPerfil(usuarioId, { rol: 'usuario' });

        // Notificar al usuario
        sistemaNotiicaciones.crearNotificacion({
            para_usuario_id: usuarioId,
            tipo: 'empleado_destituido',
            contenido: 'Ha sido removido del equipo de empleados',
            enlace: '/perfil.html'
        });

        // Historial
        sistemaHistorial.registrarAccion({
            accion: 'empleado_destituido',
            usuarioAfectado: usuarioId,
            detalles: `Empleado destituido: ${empleado.nombre}`
        });

        return { exito: true };
    }

    // Obtener empleado por usuario
    obtenerEmpleadoPorUsuario(usuario_id) {
        const empleados = this.obtenerEmpleados();
        return empleados.find(e => e.usuario_id === usuario_id) || null;
    }

    // Obtener todos los empleados
    obtenerEmpleados() {
        const empleadosStr = localStorage.getItem(this.empleadosKey);
        return empleadosStr ? JSON.parse(empleadosStr) : [];
    }

    // Obtener empleados activos
    obtenerEmpleadosActivos() {
        return this.obtenerEmpleados().filter(e => e.estado === 'activo');
    }

    // Obtener empleado por ID
    obtenerEmpleadoPorId(id) {
        return this.obtenerEmpleados().find(e => e.id === id);
    }

    // Obtener empleados por especialidad
    obtenerPorEspecialidad(especialidad) {
        return this.obtenerEmpleados().filter(e => e.especialidad === especialidad && e.estado === 'activo');
    }

    // Actualizar rating de empleado
    actualizarRating(empleado_id, nuevoRating) {
        const empleados = this.obtenerEmpleados();
        const empleado = empleados.find(e => e.id === empleado_id);

        if (empleado) {
            empleado.rating = Math.min(5, Math.max(1, nuevoRating));
            localStorage.setItem(this.empleadosKey, JSON.stringify(empleados));
            return { exito: true, empleado };
        }

        return { error: 'Empleado no encontrado' };
    }

    // Cambiar estado de empleado
    cambiarEstado(empleado_id, nuevoEstado) {
        const empleados = this.obtenerEmpleados();
        const empleado = empleados.find(e => e.id === empleado_id);

        if (empleado) {
            empleado.estado = nuevoEstado;
            localStorage.setItem(this.empleadosKey, JSON.stringify(empleados));
            return { exito: true, empleado };
        }

        return { error: 'Empleado no encontrado' };
    }

    // Buscar empleados
    buscarEmpleados(termino) {
        const empleados = this.obtenerEmpleados();
        return empleados.filter(e => 
            e.nombre.toLowerCase().includes(termino.toLowerCase()) ||
            e.nombre_usuario.toLowerCase().includes(termino.toLowerCase()) ||
            e.especialidad.toLowerCase().includes(termino.toLowerCase())
        );
    }

    // Obtener estadísticas
    obtenerEstadisticas() {
        const empleados = this.obtenerEmpleados();
        const especialidades = {};

        empleados.forEach(e => {
            especialidades[e.especialidad] = (especialidades[e.especialidad] || 0) + 1;
        });

        return {
            total: empleados.length,
            activos: empleados.filter(e => e.estado === 'activo').length,
            inactivos: empleados.filter(e => e.estado === 'inactivo').length,
            ratingPromedio: (empleados.reduce((sum, e) => sum + e.rating, 0) / empleados.length) || 0,
            porEspecialidad: especialidades
        };
    }
}

// Instancia global
const sistemaEmpleados = new SistemaEmpleados();
