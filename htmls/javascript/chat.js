/* =============================================
   FUNCIONALIDAD DEL CHAT/MENSAJERÍA
   ============================================= */

let conversacionActual = null;
let usuarioActual = null;
let usuariosCache = [];

async function apiFetch(path, options = {}) {
    console.log('apiFetch (chat.js) ejecutado', path);
    return fetch(path, Object.assign({ credentials: 'include' }, options));
}

async function verificarSesionChat() {
    try {
        const resp = await apiFetch('/api/session');
        const raw = await resp.text().catch(() => '');
        console.log('RESPUESTA CRUDA (chat session):', raw);
        const data = raw ? JSON.parse(raw) : null;
        if (!data.user) {
                console.log('REDIRECCION DETECTADA');
                console.log('Archivo: chat.js');
                console.log('Motivo: sesión inválida en chat');
                console.log('Usuario:', data.user);
                console.log('Sesion:', data);
                window.location.href = 'login.html';
                return false;
            }
            usuarioActual = data.user;
            return true;
        } catch (error) {
            console.error('Error verificando sesión:', error);
            console.log('REDIRECCION DETECTADA');
            console.log('Archivo: chat.js');
            console.log('Motivo: excepción verificando sesión en chat');
            console.log('Usuario:', null);
            console.log('Sesion:', error);
document.addEventListener('DOMContentLoaded', async function() {
    if (!await verificarSesionChat()) return;

    await cargarConversaciones();

    document.getElementById('searchUsuarios').addEventListener('input', filtrarConversaciones);
    document.getElementById('searchNuevoUsuario').addEventListener('input', buscarNuevosUsuarios);

    const conversacionId = obtenerParametroURL('conversacion');
    if (conversacionId) {
        abrirConversacion(Number(conversacionId));
    }
});

async function cargarConversaciones() {
    const container = document.getElementById('chatConversations');
    container.innerHTML = '';

    try {
        const resp = await apiFetch('/api/mensajes/conversations');
        const raw = await resp.text().catch(() => '');
        console.log('RESPUESTA CRUDA (chat conversaciones):', raw);
        const data = raw ? JSON.parse(raw) : null;
        if (!resp.ok || !data || !data.ok) {
            console.log('DATA RECIBIDA (cargarConversaciones):', data);
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--color-gris);">No se pudieron cargar tus conversaciones.</p>';
            return;
        }

        const conversaciones = buildConversationList(data.mensajes || []);
        if (!conversaciones.length) {
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--color-gris);">No hay conversaciones</p>';
            return;
        }

        conversaciones.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'chat-conversation-item';
            if (conversacionActual === conv.partner.id) item.classList.add('activa');
            const preview = conv.lastMessage.contenido.substring(0, 30);
            const badge = conv.unreadCount > 0 ? `<span class="chat-conversation-unread">${conv.unreadCount}</span>` : '';

            item.innerHTML = `
                <div class="chat-avatar">${conv.partner.foto || '👤'}</div>
                <div class="chat-conversation-info">
                    <div class="chat-conversation-nombre">${conv.partner.nombre_usuario}</div>
                    <div class="chat-conversation-preview">${preview}...</div>
                </div>
                ${badge}
            `;
            item.addEventListener('click', () => abrirConversacion(conv.partner.id));
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error cargando conversaciones:', error);
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--color-gris);">Error al cargar conversaciones.</p>';
    }
}

function buildConversationList(messages) {
    const conversations = {};

    messages.forEach(msg => {
        const partnerId = msg.remitente_id === usuarioActual.id ? msg.destinatario_id : msg.remitente_id;
        const current = conversations[partnerId] || { partnerId, lastMessage: null, unreadCount: 0, messages: [] };
        current.messages.push(msg);
        if (!current.lastMessage || new Date(msg.fecha) > new Date(current.lastMessage.fecha)) {
            current.lastMessage = msg;
        }
        if (msg.destinatario_id === usuarioActual.id && !msg.leido) {
            current.unreadCount += 1;
        }
        conversations[partnerId] = current;
    });

    return Object.values(conversations).sort((a, b) => new Date(b.lastMessage.fecha) - new Date(a.lastMessage.fecha));
}

async function abrirConversacion(usuario_id) {
    if (!usuarioActual) return;

    try {
        const resp = await apiFetch(`/api/mensajes/conversation?with=${usuario_id}`);
        const raw = await resp.text().catch(() => '');
        console.log('RESPUESTA CRUDA (chat conversacion):', raw);
        const data = raw ? JSON.parse(raw) : null;
        if (!resp.ok || !data || !data.ok) {
            console.log('DATA RECIBIDA (abrirConversacion):', data);
            mostrarToast((data && data.error) ? data.error : 'No se pudo abrir la conversación.', 'error');
            return;
        }

        conversacionActual = Number(usuario_id);
        const usuario = await fetchUsuario(usuario_id);
        if (!usuario) {
            mostrarToast('Usuario no encontrado.', 'error');
            return;
        }

        const chatMain = document.getElementById('chatMain');
        chatMain.className = 'chat-main';
        chatMain.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-info">
                    <h2>${usuario.nombre_usuario}</h2>
                    <p>${usuario.especialidad || 'Usuario'}</p>
                </div>
            </div>

            <div class="chat-messages" id="chatMessages"></div>

            <div class="chat-input-area">
                <textarea id="chatInput" placeholder="Escribe tu mensaje..." rows="2"></textarea>
                <button onclick="enviarMensaje()">Enviar</button>
            </div>
        `;

        const messagesContainer = document.getElementById('chatMessages');
        if (!data.mensajes.length) {
            messagesContainer.innerHTML = '<p style="text-align: center; color: var(--color-gris); margin: auto;">Sin mensajes. ¡Inicia la conversación!</p>';
        } else {
            data.mensajes.forEach(msg => {
                const msgEl = crearElementoMensaje(msg, usuarioActual.id);
                messagesContainer.appendChild(msgEl);
            });
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        const input = document.getElementById('chatInput');
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensaje();
            }
        });

        cargarConversaciones();
        actualizarBadgesNotificaciones();
    } catch (error) {
        console.error('Error abriendo conversación:', error);
        mostrarToast('Error al cargar la conversación.', 'error');
    }
}

function crearElementoMensaje(mensaje, usuarioActualId) {
    const div = document.createElement('div');
    div.className = 'chat-message';

    if (mensaje.remitente_id === usuarioActualId) {
        div.classList.add('enviado');
    }

    div.innerHTML = `
        <div class="chat-message-avatar">${mensaje.remitente_id === usuarioActualId ? '👤' : '📨'}</div>
        <div class="chat-message-content">
            <div class="chat-message-bubble">${mensaje.contenido}</div>
            <div class="chat-message-tiempo">${haceCuantoTiempo(mensaje.fecha)}</div>
        </div>
    `;

    return div;
}

async function enviarMensaje() {
    if (!conversacionActual) {
        mostrarToast('Selecciona una conversación', 'error');
        return;
    }

    const input = document.getElementById('chatInput');
    const contenido = input.value.trim();
    if (!contenido) return;

    try {
        const resp = await apiFetch('/api/mensajes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinatario_id: conversacionActual, contenido })
        });
        const raw = await resp.text().catch(() => '');
        console.log('RESPUESTA CRUDA (chat enviar):', raw);
        const data = raw ? JSON.parse(raw) : null;
        if (!resp.ok || !data || !data.ok) {
            console.log('DATA RECIBIDA (enviarMensaje):', data);
            mostrarToast((data && data.error) ? data.error : 'No se pudo enviar el mensaje', 'error');
            return;
        }

        input.value = '';
        const messagesContainer = document.getElementById('chatMessages');
        const msgEl = crearElementoMensaje({ remitente_id: usuarioActual.id, destinatario_id: conversacionActual, contenido, fecha: new Date().toISOString(), leido: 0 }, usuarioActual.id);
        messagesContainer.appendChild(msgEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        mostrarToast('Mensaje enviado', 'exito');
        cargarConversaciones();
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        mostrarToast('Error al enviar mensaje', 'error');
    }
}

async function fetchUsuario(id) {
    try {
        if (usuariosCache.length === 0) {
            const resp = await apiFetch('/api/users');
            const raw = await resp.text().catch(() => '');
            console.log('RESPUESTA CRUDA (chat users):', raw);
            const data = raw ? JSON.parse(raw) : null;
            if (resp.ok && data && data.ok) usuariosCache = data.usuarios;
        }
        return usuariosCache.find(u => Number(u.id) === Number(id));
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        return null;
    }
}

function mostrarBuscadorUsuarios() {
    const modal = document.getElementById('buscadorModal');
    modal.style.display = 'flex';
    document.getElementById('searchNuevoUsuario').focus();
}

function cerrarBuscador() {
    document.getElementById('buscadorModal').style.display = 'none';
    document.getElementById('searchNuevoUsuario').value = '';
    document.getElementById('usuariosResultados').innerHTML = '';
}

async function buscarNuevosUsuarios() {
    const termino = document.getElementById('searchNuevoUsuario').value.toLowerCase();
    const container = document.getElementById('usuariosResultados');

    if (!termino) {
        container.innerHTML = '';
        return;
    }

    try {
        if (usuariosCache.length === 0) {
            const resp = await apiFetch('/api/users');
            const raw = await resp.text().catch(() => '');
            console.log('RESPUESTA CRUDA (buscarNuevosUsuarios users):', raw);
            const data = raw ? JSON.parse(raw) : null;
            if (resp.ok && data && data.ok) usuariosCache = data.usuarios;
        }
        const resultados = usuariosCache.filter(u => u.id !== usuarioActual.id && u.estado === 'activo' && (u.nombre_usuario.toLowerCase().includes(termino) || (u.descripcion || '').toLowerCase().includes(termino)));
        container.innerHTML = '';

        if (resultados.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-gris);">No se encontraron usuarios</p>';
            return;
        }

        resultados.forEach(usuario => {
            const div = document.createElement('div');
            div.style.cssText = `
                padding: 12px;
                border-bottom: 1px solid rgba(124,58,237,0.2);
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                transition: background 0.3s ease;
            `;
            div.onmouseover = () => div.style.background = 'rgba(34,211,238,0.1)';
            div.onmouseout = () => div.style.background = '';

            const info = document.createElement('div');
            info.innerHTML = `
                <div style="color: var(--color-blanco); font-weight: 600;">${usuario.nombre_usuario}</div>
                <div style="color: var(--color-gris); font-size: 0.9rem;">${usuario.especialidad || 'Usuario'}</div>
            `;

            const btn = document.createElement('button');
            btn.textContent = 'Chatear';
            btn.style.cssText = `
                background: linear-gradient(135deg, #7C3AED, #22D3EE);
                border: none;
                color: white;
                padding: 8px 15px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
            `;
            btn.onclick = () => {
                cerrarBuscador();
                abrirConversacion(usuario.id);
            };

            div.appendChild(info);
            div.appendChild(btn);
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error buscando usuarios:', error);
        container.innerHTML = '<p style="text-align: center; color: var(--color-gris);">No se encontraron usuarios</p>';
    }
}

function filtrarConversaciones() {
    const termino = document.getElementById('searchUsuarios').value.toLowerCase();
    const items = document.querySelectorAll('.chat-conversation-item');

    items.forEach(item => {
        const nombre = item.querySelector('.chat-conversation-nombre').textContent.toLowerCase();
        item.style.display = nombre.includes(termino) ? 'flex' : 'none';
    });
}

window.abrirConversacion = abrirConversacion;
window.enviarMensaje = enviarMensaje;
window.mostrarBuscadorUsuarios = mostrarBuscadorUsuarios;
window.cerrarBuscador = cerrarBuscador;
window.buscarNuevosUsuarios = buscarNuevosUsuarios;
window.filtrarConversaciones = filtrarConversaciones;
