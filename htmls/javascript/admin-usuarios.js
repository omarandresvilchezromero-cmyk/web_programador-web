/* =============================================
   GESTIÓN DE USUARIOS - ADMIN
   ============================================= */

let filtroActual = 'todos';
let busquedaTerm = '';
let usuariosCache = [];

document.addEventListener('DOMContentLoaded', async function() {
    if (window.sessionSyncPromise) await window.sessionSyncPromise;
    if (!verificarAdmin()) return;
    cargarUsuarios();
    
    document.getElementById('searchUsuarios').addEventListener('input', function() {
        busquedaTerm = this.value;
        cargarUsuarios();
    });
});

/* ==================== CARGAR USUARIOS ==================== */

async function cargarUsuarios() {
    const container = document.getElementById('usuariosGrid');
    let usuarios = [];

    try {
        const resp = await fetch('/api/admin/usuarios', { credentials: 'include' });
        if (!resp.ok) throw new Error('Error al obtener usuarios');
        const raw = await resp.text().catch(() => '');
        console.log('RESPUESTA CRUDA (admin-usuarios cargarUsuarios):', raw);
        const data = raw ? JSON.parse(raw) : null;
        if (data && data.usuarios && Array.isArray(data.usuarios)) {
            usuarios = data.usuarios;
        }
    } catch (err) {
        console.error('No se pudo obtener usuarios desde el servidor:', err);
        container.innerHTML = '<div class="usuario-empty" style="grid-column: 1/-1;"><p>No se pudo cargar la lista de usuarios.</p></div>';
        return;
    }

    usuariosCache = usuarios;

    let usuariosFiltrados = usuarios.filter(u => {
        if (filtroActual === 'todos') return true;
        if (filtroActual === 'activos') return u.estado === 'activo';
        if (filtroActual === 'suspendidos') return u.estado === 'suspendido';
        if (filtroActual === 'baneados') return u.estado === 'baneado';
        return true;
    });

    if (busquedaTerm) {
        usuariosFiltrados = usuariosFiltrados.filter(u =>
            u.nombreCompleto.toLowerCase().includes(busquedaTerm.toLowerCase()) ||
            u.nombre_usuario.toLowerCase().includes(busquedaTerm.toLowerCase())
        );
    }

    container.innerHTML = '';

    if (usuariosFiltrados.length === 0) {
        container.innerHTML = '<div class="usuario-empty" style="grid-column: 1/-1;"><p>No se encontraron usuarios</p></div>';
        return;
    }

    usuariosFiltrados.forEach(usuario => {
        const card = crearTarjetaUsuario(usuario);
        container.appendChild(card);
    });
}

/* ==================== CREAR TARJETA DE USUARIO ==================== */

function crearTarjetaUsuario(usuario) {
    const div = document.createElement('div');
    div.className = 'usuario-card';

    const empleado = sistemaEmpleados.obtenerEmpleadoPorUsuario(usuario.id);
    const rolBadge = empleado ? '🏢 Empleado' : usuario.rol === 'administrador' ? '⚙️ Admin' : '👤 Usuario';

    div.innerHTML = `
        <div class="usuario-avatar">${usuario.foto}</div>
        
        <div class="usuario-nombre">${usuario.nombreCompleto}</div>
        <div class="usuario-username">@${usuario.nombre_usuario}</div>
        
        <span class="usuario-estado ${usuario.estado}">${usuario.estado.toUpperCase()}</span>
        
        <div class="usuario-info">
            <div><strong>Rol:</strong> ${rolBadge}</div>
            <div><strong>Email:</strong> ${usuario.email || 'No especificado'}</div>
            <div><strong>Registrado:</strong> ${formatearFecha(usuario.fechaRegistro)}</div>
            ${usuario.especialidad ? `<div><strong>Especialidad:</strong> ${usuario.especialidad}</div>` : ''}
        </div>

        <div class="usuario-acciones">
            <button class="usuario-btn usuario-btn-info" onclick="verDetalles('${usuario.id}')">Detalles</button>
            ${usuario.estado === 'activo' ? 
                `<button class="usuario-btn usuario-btn-suspender" onclick="suspenderUsuario('${usuario.id}')">Suspender</button>` :
                `<button class="usuario-btn usuario-btn-suspender" onclick="reactivarUsuario('${usuario.id}')">Reactivar</button>`
            }
            <button class="usuario-btn usuario-btn-eliminar" onclick="eliminarUsuario('${usuario.id}')">Eliminar</button>
        </div>
    `;

    return div;
}

/* ==================== FILTRAR USUARIOS ==================== */

function filtrarUsuarios(filtro) {
    filtroActual = filtro;

    // Actualizar botones
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('activo');
    });
    event.target.classList.add('activo');

    cargarUsuarios();
}

/* ==================== VER DETALLES ==================== */

function obtenerUsuarioUnified(usuario_id) {
    const desdeCache = usuariosCache.find(u => String(u.id) === String(usuario_id));
    if (desdeCache) return desdeCache;
    return sistemaUsuarios.obtenerUsuarioPorId(usuario_id);
}

function verDetalles(usuario_id) {
    const usuario = obtenerUsuarioUnified(usuario_id);
    const empleado = sistemaEmpleados.obtenerEmpleadoPorUsuario(usuario_id);
    const modal = document.getElementById('detallesModal');
    const content = document.getElementById('detallesContent');

    const htmlContenido = `
        <h2 style="margin-top: 0;">Detalles del Usuario</h2>

        <div style="background: rgba(124,58,237,0.2); padding: 20px; border-radius: 10px; margin: 20px 0;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                <div style="
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, #7C3AED, #22D3EE);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                ">${usuario.foto}</div>
                <div>
                    <div style="color: white; font-weight: 600; font-size: 1.2rem;">${usuario.nombreCompleto}</div>
                    <div style="color: var(--color-gris);">@${usuario.nombre_usuario}</div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <strong>ID:</strong><br>
                    <code style="background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px; font-size: 0.85rem;">${usuario.id}</code>
                </div>
                <div>
                    <strong>Email:</strong><br>
                    ${usuario.email || 'No especificado'}
                </div>
                <div>
                    <strong>Rol:</strong><br>
                    ${usuario.rol === 'administrador' ? '⚙️ Administrador' : usuario.rol === 'empleado' ? '🏢 Empleado' : '👤 Usuario'}
                </div>
                <div>
                    <strong>Estado:</strong><br>
                    <span style="
                        padding: 5px 10px;
                        border-radius: 5px;
                        ${usuario.estado === 'activo' ? 'background: rgba(16,185,129,0.2); color: #10B981;' : 'background: rgba(239,68,68,0.2); color: #EF4444;'}
                    ">${usuario.estado.toUpperCase()}</span>
                </div>
            </div>
        </div>

        <div style="margin: 20px 0;">
            <h3>Información Personal</h3>
            <p><strong>Especialidad:</strong> ${usuario.especialidad || 'No especificada'}</p>
            <p><strong>Descripción:</strong> ${usuario.descripcion || 'No especificada'}</p>
            <p><strong>Teléfonos:</strong> ${usuario.telefonos.join(', ') || 'No especificados'}</p>
            <p><strong>Dirección:</strong> ${usuario.direccion || 'No especificada'}</p>
            <p><strong>Fecha de Registro:</strong> ${formatearFechaHora(usuario.fechaRegistro)}</p>
        </div>

        ${empleado ? `
            <div style="margin: 20px 0; background: rgba(16,185,129,0.1); padding: 15px; border-radius: 10px; border-left: 3px solid #10B981;">
                <h3 style="margin-top: 0;">Información de Empleado</h3>
                <p><strong>ID de Empleado:</strong> ${empleado.id}</p>
                <p><strong>Insignia:</strong> ✓ ${empleado.insignia}</p>
                <p><strong>Especialidad:</strong> ${empleado.especialidad}</p>
                <p><strong>Años de Experiencia:</strong> ${empleado.anosExperiencia}</p>
                <p><strong>Rating:</strong> ⭐ ${empleado.rating.toFixed(1)}/5.0</p>
                <p><strong>Fecha de Ingreso:</strong> ${formatearFecha(empleado.fechaIngreso)}</p>
            </div>
        ` : ''}

        <div style="margin: 20px 0;">
            <h3>Acciones Administrativas</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button onclick="suspenderUsuario('${usuario.id}'); cerrarModal()" style="
                    background: rgba(251,146,60,0.3);
                    border: 1px solid rgba(251,146,60,0.5);
                    color: #fb923c;
                    padding: 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">Suspender</button>
                <button onclick="banearUsuario('${usuario.id}'); cerrarModal()" style="
                    background: rgba(239,68,68,0.3);
                    border: 1px solid rgba(239,68,68,0.5);
                    color: #EF4444;
                    padding: 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">Banear</button>
            </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button onclick="cerrarModal()" style="
                flex: 1;
                background: rgba(124,58,237,0.2);
                border: 1px solid rgba(124,58,237,0.5);
                color: var(--color-azul-neon);
                padding: 10px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
            ">Cerrar</button>
        </div>
    `;

    content.innerHTML = htmlContenido;
    modal.style.display = 'flex';

    // Cerrar al clickear fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModal();
        }
    });
}

function cerrarModal() {
    document.getElementById('detallesModal').style.display = 'none';
}

/* ==================== ACCIONES ==================== */

async function actualizarEstadoUsuarioBackend(usuario_id, estado) {
    const resp = await fetch(`/api/admin/usuarios/${usuario_id}/estado`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
    });
    if (!resp.ok) return { ok: false, error: 'No se pudo actualizar el usuario' };
    const raw = await resp.text().catch(() => '');
    console.log('RESPUESTA CRUDA (admin-usuarios actualizarEstado):', raw);
    const data = raw ? JSON.parse(raw) : null;
    return data || { ok: false, error: 'Respuesta inválida' };
}

async function eliminarUsuarioBackend(usuario_id) {
    const resp = await fetch(`/api/admin/usuarios/${usuario_id}`, {
        method: 'DELETE',
        credentials: 'include'
    });
    if (!resp.ok) return { ok: false, error: 'No se pudo eliminar el usuario' };
    const raw = await resp.text().catch(() => '');
    console.log('RESPUESTA CRUDA (admin-usuarios eliminar):', raw);
    const data = raw ? JSON.parse(raw) : null;
    return data || { ok: false, error: 'Respuesta inválida' };
}

async function suspenderUsuario(usuario_id) {
    const usuario = obtenerUsuarioUnified(usuario_id);
    const nuevoEstado = usuario.estado === 'suspendido' ? 'activo' : 'suspendido';
    const accion = nuevoEstado === 'suspendido' ? 'suspender' : 'reactivar';

    if (!confirmar(`¿Deseas ${accion} a ${usuario.nombre_usuario}?`)) {
        return;
    }

    const data = await actualizarEstadoUsuarioBackend(usuario_id, nuevoEstado);
    if (!data || !data.ok) {
        console.log('DATA RECIBIDA (actualizarEstadoUsuarioBackend):', data);
        mostrarToast((data && data.error) ? data.error : 'Error al actualizar el estado del usuario', 'error');
        return;
    }

    mostrarToast(`Usuario ${accion}do`, 'exito');
    cargarUsuarios();
}

async function banearUsuario(usuario_id) {
    const usuario = obtenerUsuarioUnified(usuario_id);

    if (!confirmar(`⚠️ ¿Estás seguro de que deseas banear a ${usuario.nombre_usuario}?\n\nEsta acción es irreversible.`)) {
        return;
    }

    const data = await actualizarEstadoUsuarioBackend(usuario_id, 'baneado');
    if (!data || !data.ok) {
        console.log('DATA RECIBIDA (banearUsuario):', data);
        mostrarToast((data && data.error) ? data.error : 'Error al banear el usuario', 'error');
        return;
    }

    mostrarToast('Usuario baneado', 'exito');
    cargarUsuarios();
}

async function eliminarUsuario(usuario_id) {
    const usuario = obtenerUsuarioUnified(usuario_id);

    if (!confirmar(`⚠️ ¿Estás seguro de que deseas ELIMINAR a ${usuario.nombre_usuario}?\n\nEsta acción NO se puede deshacer.`)) {
        return;
    }

    const data = await eliminarUsuarioBackend(usuario_id);
    if (!data || !data.ok) {
        console.log('DATA RECIBIDA (eliminarUsuario):', data);
        mostrarToast((data && data.error) ? data.error : 'Error al eliminar el usuario', 'error');
        return;
    }

    mostrarToast('Usuario eliminado', 'exito');
    cargarUsuarios();
}

function reactivarUsuario(usuario_id) {
    suspenderUsuario(usuario_id);
}

// Hacer funciones globales
window.cargarUsuarios = cargarUsuarios;
window.filtrarUsuarios = filtrarUsuarios;
window.verDetalles = verDetalles;
window.cerrarModal = cerrarModal;
window.suspenderUsuario = suspenderUsuario;
window.banearUsuario = banearUsuario;
window.eliminarUsuario = eliminarUsuario;
window.reactivarUsuario = reactivarUsuario;
