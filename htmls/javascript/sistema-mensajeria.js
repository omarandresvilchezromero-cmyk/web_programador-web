/* =============================================
   SISTEMA DE MENSAJERÍA INTERNA
   ============================================= */

class SistemaMensajeria {
    constructor() {
        this.mensajesKey = 'mensajes';
        this.conversacionesKey = 'conversaciones';
        this.inicializar();
    }

    inicializar() {
        if (!localStorage.getItem(this.mensajesKey)) {
            localStorage.setItem(this.mensajesKey, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.conversacionesKey)) {
            localStorage.setItem(this.conversacionesKey, JSON.stringify([]));
        }
    }

    // Enviar mensaje
    enviarMensaje(remitente_id, destinatario_id, contenido) {
        const remitente = sistemaUsuarios.obtenerUsuarioPorId(remitente_id);
        const destinatario = sistemaUsuarios.obtenerUsuarioPorId(destinatario_id);

        if (!remitente || !destinatario) {
            return { error: 'Usuario no encontrado' };
        }

        if (remitente.estado === 'baneado') {
            return { error: 'No puedes enviar mensajes' };
        }

        const nuevoMensaje = {
            id: 'MSG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            remitente_id: remitente_id,
            remitente_nombre: remitente.nombre_usuario,
            destinatario_id: destinatario_id,
            destinatario_nombre: destinatario.nombre_usuario,
            contenido: contenido,
            fecha: new Date().toISOString(),
            leido: false,
            editado: false,
            fechaEdicion: null
        };

        const mensajes = this.obtenerMensajes();
        mensajes.push(nuevoMensaje);
        localStorage.setItem(this.mensajesKey, JSON.stringify(mensajes));

        // Actualizar conversación
        this.actualizarConversacion(remitente_id, destinatario_id, nuevoMensaje.id);

        // Crear notificación
        sistemaNotiicaciones.crearNotificacion({
            tipo: 'mensaje_nuevo',
            para_usuario_id: destinatario_id,
            de_usuario_id: remitente_id,
            de_usuario_nombre: remitente.nombre_usuario,
            contenido: `Nuevo mensaje de ${remitente.nombre_usuario}`,
            enlace: `/chat.html?conversacion=${remitente_id}`
        });

        return { exito: true, mensaje: nuevoMensaje };
    }

    // Obtener conversación entre dos usuarios
    obtenerConversacion(usuario1_id, usuario2_id) {
        const mensajes = this.obtenerMensajes();
        return mensajes.filter(m => 
            (m.remitente_id === usuario1_id && m.destinatario_id === usuario2_id) ||
            (m.remitente_id === usuario2_id && m.destinatario_id === usuario1_id)
        ).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    }

    // Obtener bandeja de entrada
    obtenerBandeja(usuario_id) {
        const mensajes = this.obtenerMensajes();
        const conversaciones = {};

        mensajes.forEach(m => {
            if (m.destinatario_id === usuario_id || m.remitente_id === usuario_id) {
                const otro_id = m.remitente_id === usuario_id ? m.destinatario_id : m.remitente_id;
                
                if (!conversaciones[otro_id]) {
                    conversaciones[otro_id] = {
                        usuario_id: otro_id,
                        usuario: sistemaUsuarios.obtenerUsuarioPorId(otro_id),
                        ultimoMensaje: m,
                        mensajesNoLeidos: 0,
                        total: 0
                    };
                }

                conversaciones[otro_id].total++;
                if (m.destinatario_id === usuario_id && !m.leido) {
                    conversaciones[otro_id].mensajesNoLeidos++;
                }
                conversaciones[otro_id].ultimoMensaje = m;
            }
        });

        return Object.values(conversaciones).sort((a, b) => 
            new Date(b.ultimoMensaje.fecha) - new Date(a.ultimoMensaje.fecha)
        );
    }

    // Obtener mensajes enviados
    obtenerEnviados(usuario_id) {
        const mensajes = this.obtenerMensajes();
        return mensajes.filter(m => m.remitente_id === usuario_id);
    }

    // Marcar como leído
    marcarComoLeido(mensaje_id) {
        const mensajes = this.obtenerMensajes();
        const mensaje = mensajes.find(m => m.id === mensaje_id);

        if (mensaje) {
            mensaje.leido = true;
            localStorage.setItem(this.mensajesKey, JSON.stringify(mensajes));
            return { exito: true };
        }

        return { error: 'Mensaje no encontrado' };
    }

    // Obtener mensajes no leídos
    obtenerNoLeidos(usuario_id) {
        const mensajes = this.obtenerMensajes();
        return mensajes.filter(m => m.destinatario_id === usuario_id && !m.leido);
    }

    // Contar mensajes no leídos
    contarNoLeidos(usuario_id) {
        return this.obtenerNoLeidos(usuario_id).length;
    }

    // Obtener todos los mensajes
    obtenerMensajes() {
        const mensajesStr = localStorage.getItem(this.mensajesKey);
        return mensajesStr ? JSON.parse(mensajesStr) : [];
    }

    // Actualizar conversación
    actualizarConversacion(usuario1_id, usuario2_id, ultimoMensajeId) {
        const conversaciones = JSON.parse(localStorage.getItem(this.conversacionesKey)) || [];
        
        const convId = [usuario1_id, usuario2_id].sort().join('-');
        let conversacion = conversaciones.find(c => c.id === convId);

        if (!conversacion) {
            conversacion = {
                id: convId,
                usuario1_id: usuario1_id,
                usuario2_id: usuario2_id,
                ultimoMensajeId: ultimoMensajeId,
                fecha: new Date().toISOString()
            };
            conversaciones.push(conversacion);
        } else {
            conversacion.ultimoMensajeId = ultimoMensajeId;
            conversacion.fecha = new Date().toISOString();
        }

        localStorage.setItem(this.conversacionesKey, JSON.stringify(conversaciones));
    }

    // Eliminar conversación
    eliminarConversacion(usuario1_id, usuario2_id) {
        const mensajes = this.obtenerMensajes();
        const nuevosMensajes = mensajes.filter(m => 
            !((m.remitente_id === usuario1_id && m.destinatario_id === usuario2_id) ||
              (m.remitente_id === usuario2_id && m.destinatario_id === usuario1_id))
        );

        localStorage.setItem(this.mensajesKey, JSON.stringify(nuevosMensajes));
        return { exito: true };
    }

    // Buscar mensajes
    buscarMensajes(usuario_id, termino) {
        const bandeja = this.obtenerBandeja(usuario_id);
        return bandeja.filter(conv => 
            conv.usuario.nombre_usuario.toLowerCase().includes(termino.toLowerCase()) ||
            conv.usuario.nombreCompleto.toLowerCase().includes(termino.toLowerCase())
        );
    }
}

// Instancia global
const sistemaMensajeria = new SistemaMensajeria();
