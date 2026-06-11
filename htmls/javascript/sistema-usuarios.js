/* =============================================
   SISTEMA CENTRAL DE USUARIOS (COMPATIBILIDAD)
   ============================================= */

class SistemaUsuarios {
    constructor() {
        this.usuariosKey = 'usuarios';
        this.inicializar();
    }

    inicializar() {
        if (!localStorage.getItem(this.usuariosKey)) {
            const usuariosDefault = [
                {
                    id: 'ADMIN-001',
                    nombreCompleto: 'Administrador Sistema',
                    nombre_usuario: 'admin',
                    email: 'admin@plataforma.com',
                    password: this.hashPassword('admin123'),
                    rol: 'administrador',
                    estado: 'activo',
                    foto: '👨‍💼',
                    descripcion: 'Administrador principal del sistema',
                    fechaRegistro: new Date().toISOString(),
                    telefonos: [],
                    direccion: '',
                    especialidad: 'Administración de Sistemas'
                }
            ];
            localStorage.setItem(this.usuariosKey, JSON.stringify(usuariosDefault));
        }
    }

    hashPassword(password) {
        return btoa(password);
    }

    registrarUsuario(datos) {
        const usuarios = this.obtenerUsuarios();
        if (usuarios.some(u => u.nombre_usuario === datos.nombre_usuario)) {
            return { error: 'El nombre de usuario ya existe' };
        }

        const nuevoUsuario = {
            id: 'USR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            nombreCompleto: datos.nombreCompleto,
            nombre_usuario: datos.nombre_usuario,
            email: datos.email,
            password: this.hashPassword(datos.password),
            rol: 'usuario',
            estado: 'activo',
            foto: datos.foto || '👤',
            descripcion: datos.descripcion || '',
            fechaRegistro: new Date().toISOString(),
            telefonos: datos.telefonos || [],
            direccion: datos.direccion || '',
            especialidad: datos.especialidad || ''
        };

        usuarios.push(nuevoUsuario);
        localStorage.setItem(this.usuariosKey, JSON.stringify(usuarios));

        if (window.sistemaHistorial && typeof window.sistemaHistorial.registrarAccion === 'function') {
            window.sistemaHistorial.registrarAccion({
                accion: 'usuario_registrado',
                usuarioAfectado: nuevoUsuario.id,
                detalles: `Nuevo usuario registrado: ${nuevoUsuario.nombre_usuario}`
            });
        }

        return { exito: true, usuario: nuevoUsuario };
    }

    login(nombre_usuario, password) {
        const usuarios = this.obtenerUsuarios();
        const usuario = usuarios.find(u => u.nombre_usuario === nombre_usuario);

        if (!usuario) {
            return { error: 'Usuario no encontrado' };
        }

        if (usuario.password !== this.hashPassword(password)) {
            return { error: 'Contraseña incorrecta' };
        }

        if (usuario.estado === 'baneado') {
            return { error: 'Usuario baneado' };
        }

        if (usuario.estado === 'suspendido') {
            return { error: 'Usuario suspendido' };
        }

        window.__currentUser = usuario;
        return { exito: true, usuario };
    }

    logout() {
        window.__currentUser = null;
    }

    obtenerUsuarioActual() {
        return window.__currentUser || null;
    }

    obtenerUsuarios() {
        const usuariosStr = localStorage.getItem(this.usuariosKey);
        return usuariosStr ? JSON.parse(usuariosStr) : [];
    }

    obtenerUsuarioPorId(id) {
        const usuarios = this.obtenerUsuarios();
        return usuarios.find(u => u.id === id);
    }

    buscarUsuarios(termino) {
        const usuarios = this.obtenerUsuarios();
        return usuarios.filter(u =>
            u.nombreCompleto.toLowerCase().includes(termino.toLowerCase()) ||
            u.nombre_usuario.toLowerCase().includes(termino.toLowerCase())
        );
    }

    actualizarPerfil(usuarioId, datos) {
        const usuarios = this.obtenerUsuarios();
        const usuario = usuarios.find(u => u.id === usuarioId);

        if (!usuario) {
            return { error: 'Usuario no encontrado' };
        }

        Object.assign(usuario, datos);
        localStorage.setItem(this.usuariosKey, JSON.stringify(usuarios));

        const usuarioActual = this.obtenerUsuarioActual();
        if (usuarioActual && usuarioActual.id === usuarioId) {
            window.__currentUser = usuario;
        }

        return { exito: true, usuario };
    }

    cambiarEstadoUsuario(usuarioId, nuevoEstado) {
        const usuarios = this.obtenerUsuarios();
        const usuario = usuarios.find(u => u.id === usuarioId);

        if (!usuario) {
            return { error: 'Usuario no encontrado' };
        }

        usuario.estado = nuevoEstado;
        localStorage.setItem(this.usuariosKey, JSON.stringify(usuarios));

        if (window.sistemaHistorial && typeof window.sistemaHistorial.registrarAccion === 'function') {
            window.sistemaHistorial.registrarAccion({
                accion: 'usuario_estado_cambio',
                usuarioAfectado: usuarioId,
                detalles: `Estado cambiado a: ${nuevoEstado}`
            });
        }

        return { exito: true, usuario };
    }

    eliminarUsuario(usuarioId) {
        const usuarios = this.obtenerUsuarios();
        const usuarioIndex = usuarios.findIndex(u => u.id === usuarioId);

        if (usuarioIndex === -1) {
            return { error: 'Usuario no encontrado' };
        }

        const usuarioEliminado = usuarios[usuarioIndex];
        usuarios.splice(usuarioIndex, 1);
        localStorage.setItem(this.usuariosKey, JSON.stringify(usuarios));

        if (window.sistemaHistorial && typeof window.sistemaHistorial.registrarAccion === 'function') {
            window.sistemaHistorial.registrarAccion({
                accion: 'usuario_eliminado',
                usuarioAfectado: usuarioId,
                detalles: `Usuario eliminado: ${usuarioEliminado.nombre_usuario}`
            });
        }

        return { exito: true };
    }

    obtenerUsuariosPorRol(rol) {
        const usuarios = this.obtenerUsuarios();
        return usuarios.filter(u => u.rol === rol && u.estado === 'activo');
    }

    obtenerUsuariosActivos() {
        const usuarios = this.obtenerUsuarios();
        return usuarios.filter(u => u.estado === 'activo');
    }
}

const sistemaUsuarios = new SistemaUsuarios();
