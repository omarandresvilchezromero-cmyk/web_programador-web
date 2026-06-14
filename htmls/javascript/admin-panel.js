/* =============================================
   PANEL ADMINISTRATIVO - LÓGICA
   ============================================= */

let solicitudActualModal = null;
let solicitudes = [];
let empleados = [];

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar si el usuario es administrador
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) return;

    // Cargar datos iniciales
    await loadAllSolicitudes();
    await loadAllEmpleados();

    // Event listeners para tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Event listeners para búsqueda y filtrado de empleados
    document.getElementById('search-empleados').addEventListener('input', filterEmpleados);
    document.getElementById('filter-especialidad').addEventListener('change', filterEmpleados);
});

/* ==================== VERIFICAR ACCESO DE ADMINISTRADOR ==================== */
async function checkAdminAccess() {
    try {
        const txt = await (await apiFetch('/api/session')).text();
        console.log('RESPUESTA CRUDA (admin-panel session):', txt);
        const data = txt ? JSON.parse(txt) : null;
        const usuarioActualRaw = data.user;

        if (usuarioActualRaw && usuarioActualRaw.rol && (usuarioActualRaw.rol.toLowerCase() === 'administrador' || usuarioActualRaw.rol.toLowerCase() === 'admin')) {
            const usuarioActual = {
                id: usuarioActualRaw.id,
                nombreCompleto: usuarioActualRaw.nombre_usuario || usuarioActualRaw.nombreCompleto || '',
                nombre_usuario: usuarioActualRaw.nombre_usuario || usuarioActualRaw.nombreCompleto || '',
                email: usuarioActualRaw.correoUsuario || usuarioActualRaw.email || '',
                rol: usuarioActualRaw.rol || 'usuario',
                estado: usuarioActualRaw.estado || 'activo',
                foto: usuarioActualRaw.foto || '👤',
                descripcion: usuarioActualRaw.descripcion || '',
                fechaRegistro: usuarioActualRaw.fechaRegistro || new Date().toISOString(),
                especialidad: usuarioActualRaw.especialidad || ''
            };
            window.setCurrentUser(usuarioActual);
            return true;
        }
    } catch (error) {
        console.warn('Error verificando acceso admin:', error);
    }

    localStorage.removeItem('usuarioActual');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminSession');
    console.log('Acceso de administrador requerido');
    window.location.href = 'login.html';
    return false;
}

/* ==================== CAMBIAR ENTRE TABS ==================== */
function switchTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Deseleccionar todos los botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar tab seleccionado
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Marcar botón como activo
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

/* ==================== CARGAR TODAS LAS SOLICITUDES ==================== */
async function loadAllSolicitudes() {
    try {
        solicitudes = await fetchAdminSolicitudes();
    } catch (error) {
        console.error('Error cargando solicitudes del servidor:', error);
        solicitudes = [];
    }

    const pendientes = solicitudes.filter(s => s.estado === 'pendiente');
    const aceptadas = solicitudes.filter(s => s.estado === 'aceptada');
    const rechazadas = solicitudes.filter(s => s.estado === 'rechazada');

    document.getElementById('count-pendientes').textContent = pendientes.length;
    document.getElementById('count-aceptadas').textContent = aceptadas.length;
    document.getElementById('count-rechazadas').textContent = rechazadas.length;

    displaySolicitudes('pendientes', pendientes);
    displaySolicitudes('aceptadas', aceptadas);
    displaySolicitudes('rechazadas', rechazadas);
}

async function fetchAdminSolicitudes() {
    const res = await apiFetch('/api/admin/solicitudes');
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data.solicitudes) ? data.solicitudes : [];
}

async function approveSolicitud(solicitudId) {
    try {
        const response = await apiFetch(`/api/admin/solicitudes/${solicitudId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve', insignia: 'empleado-verificado' })
        });
        const data = await response.json().catch(() => ({}));
        return response.ok ? { ok: true, data } : { ok: false, error: data.error || 'Error al aprobar' };
    } catch (err) {
        console.error('Error aprobando solicitud:', err);
        return { ok: false, error: 'Error de conexión al aprobar solicitud' };
    }
}

async function rejectSolicitud(solicitudId, razonRechazo) {
    try {
        const response = await apiFetch(`/api/admin/solicitudes/${solicitudId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject', razonRechazo })
        });
        const data = await response.json().catch(() => ({}));
        return response.ok ? { ok: true, data } : { ok: false, error: data.error || 'Error al rechazar' };
    } catch (err) {
        console.error('Error rechazando solicitud:', err);
        return { ok: false, error: 'Error de conexión al rechazar solicitud' };
    }
}

async function fetchAdminEmpleados() {
    try {
        const res = await apiFetch('/api/admin/empleados');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rows = Array.isArray(data.empleados) ? data.empleados : [];
        return rows.map(row => ({
            ...row,
            idEmpleado: row.id_empleado || row.idEmpleado || row.id || '',
            nombreCompleto: row.user_nombre || row.nombre_usuario || row.nombreCompleto || row.correoUsuario || row.user_email || 'Empleado',
            especialidad: row.especialidad || 'Sin especialidad',
            anosExperiencia: row.experiencia || row.anosExperiencia || 0,
            disponibilidad: Array.isArray(row.disponibilidad) ? row.disponibilidad : (row.disponibilidad ? [row.disponibilidad] : []),
            fechaIngreso: row.fecha_ingreso || row.fechaIngreso || null,
            rating: row.rating || 5
        }));
    } catch (error) {
        console.error('Error obteniendo empleados:', error);
        return [];
    }
}

async function loadAllEmpleados() {
    empleados = await fetchAdminEmpleados();
    document.getElementById('count-empleados').textContent = empleados.length;
    displayEmpleados(empleados);
}

/* ==================== MOSTRAR SOLICITUDES ==================== */
function displaySolicitudes(tipo, solicitudesList) {
    const container = document.getElementById(`${tipo}-list`);
    const emptyState = document.getElementById(`no-${tipo}`);

    container.innerHTML = '';

    if (!solicitudesList || solicitudesList.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    solicitudesList.forEach((solicitud, index) => {
        const card = createSolicitudCard(solicitud, tipo);
        card.style.animationDelay = `${0.05 * index}s`;
        container.appendChild(card);
    });
}

/* ==================== CREAR TARJETA DE SOLICITUD ==================== */
function createSolicitudCard(solicitud, tipo) {
    const card = document.createElement('div');
    card.className = 'solicitud-card';
    card.style.animation = 'fadeInUp 0.5s ease-out backwards';

    const especialidadLabel = getEspecialidadLabel(solicitud.especialidad || solicitud.usuario_especialidad || 'N/A');
    const estadoBadgeClass = `badge-${solicitud.estado}`;
    const estadoLabel = solicitud.estado ? solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1) : 'Sin estado';
    const nombreSolicitante = solicitud.nombre_usuario || solicitud.usuario_nombre || 'Usuario';
    const correoSolicitante = solicitud.correoUsuario || solicitud.usuario_email || '';

    let actionsHTML = '';
    
    if (solicitud.estado === 'pendiente') {
        actionsHTML = `
            <div class="solicitud-actions">
                <button class="btn-action btn-aceptar" onclick="showModalAceptar('${solicitud.id}')">
                    Aceptar
                </button>
                <button class="btn-action btn-rechazar" onclick="showModalRechazar('${solicitud.id}')">
                    Rechazar
                </button>
                <button class="btn-action btn-ver-detalles" onclick="showModalDetalles('${solicitud.id}')">
                    Ver Detalles
                </button>
            </div>
        `;
    } else {
        actionsHTML = `
            <div class="solicitud-actions">
                <button class="btn-action btn-ver-detalles" onclick="showModalDetalles('${solicitud.id}')">
                    Ver Detalles
                </button>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="solicitud-header">
            <div class="solicitud-nombre">${nombreSolicitante}</div>
            <span class="solicitud-badge ${estadoBadgeClass}">${estadoLabel}</span>
        </div>

        <div class="solicitud-info">
            <div class="info-item">
                <span class="info-label">Email</span>
                <span class="info-value">${correoSolicitante}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Especialidad</span>
                <span class="info-value">${especialidadLabel}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Experiencia</span>
                <span class="info-value">${solicitud.experiencia || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Fecha Solicitud</span>
                <span class="info-value">${formatDate(solicitud.fecha_solicitud)}</span>
            </div>
        </div>

        ${actionsHTML}
    `;

    return card;
}

/* ==================== MOSTRAR MODAL DE DETALLES ==================== */
function showModalDetalles(solicitudId) {
    const solicitud = solicitudes.find(s => s.id === solicitudId);
    if (!solicitud) return;

    solicitudActualModal = solicitud;
    const especialidadLabel = getEspecialidadLabel(solicitud.especialidad || solicitud.usuario_especialidad || 'N/A');

    let contenidoAdicional = '';
    if (solicitud.estado === 'aceptada') {
        contenidoAdicional = `
            <div class="detalle" style="grid-column: 1 / -1;">
                <div class="detalle-label">Solicitud Aprobada</div>
                <div class="detalle-valor">Se ha creado el registro de empleado y se notificó al candidato.</div>
            </div>
        `;
    } else if (solicitud.estado === 'rechazada') {
        contenidoAdicional = `
            <div class="detalle" style="grid-column: 1 / -1;">
                <div class="detalle-label">Razón del Rechazo</div>
                <div class="detalle-valor">${solicitud.razon_rechazo || 'No especificada'}</div>
            </div>
        `;
    } else if (solicitud.estado === 'info_requerida') {
        contenidoAdicional = `
            <div class="detalle" style="grid-column: 1 / -1;">
                <div class="detalle-label">Información solicitada</div>
                <div class="detalle-valor">${solicitud.info_solicitada || 'No disponible'}</div>
            </div>
        `;
    }

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h2>${solicitud.nombre_usuario || 'Solicitante'}</h2>

        <div class="modal-detalles">
            <div class="detalle">
                <div class="detalle-label">Estado</div>
                <div class="detalle-valor" style="text-transform: capitalize;">${solicitud.estado}</div>
            </div>
            <div class="detalle">
                <div class="detalle-label">Correo</div>
                <div class="detalle-valor">${solicitud.correoUsuario || solicitud.usuario_email || 'N/A'}</div>
            </div>
            <div class="detalle">
                <div class="detalle-label">Especialidad</div>
                <div class="detalle-valor">${especialidadLabel}</div>
            </div>
            <div class="detalle">
                <div class="detalle-label">Experiencia</div>
                <div class="detalle-valor">${solicitud.experiencia || 'N/A'}</div>
            </div>
            <div class="detalle" style="grid-column: 1 / -1;">
                <div class="detalle-label">Descripción</div>
                <div class="detalle-valor">${solicitud.descripcion || 'No disponible'}</div>
            </div>
            <div class="detalle" style="grid-column: 1 / -1;">
                <div class="detalle-label">Fecha de Solicitud</div>
                <div class="detalle-valor">${formatDateTime(solicitud.fecha_solicitud)}</div>
            </div>
            ${solicitud.fecha_aprobacion ? `
            <div class="detalle" style="grid-column: 1 / -1;">
                <div class="detalle-label">Fecha de Aprobación</div>
                <div class="detalle-valor">${formatDateTime(solicitud.fecha_aprobacion)}</div>
            </div>` : ''}
            ${contenidoAdicional}
        </div>
    `;

    document.getElementById('detallesModal').style.display = 'flex';
}

/* ==================== MOSTRAR MODAL ACEPTAR ==================== */
async function showModalAceptar(solicitudId) {
    const solicitud = solicitudes.find(s => s.id === solicitudId);
    if (!solicitud) return;

    if (confirm(`¿Aceptar solicitud de ${solicitud.nombre_usuario || 'este solicitante'}?`)) {
        const result = await approveSolicitud(solicitudId);
        if (result.ok) {
            alert('Solicitud aprobada correctamente.');
            await loadAllSolicitudes();
            await loadAllEmpleados();
            closeModal();
        } else {
            alert(result.error || 'Error al aprobar la solicitud');
        }
    }
}

/* ==================== MOSTRAR MODAL RECHAZAR ==================== */
function showModalRechazar(solicitudId) {
    solicitudActualModal = solicitudes.find(s => s.id === solicitudId);
    if (!solicitudActualModal) return;

    document.getElementById('rechazarModal').style.display = 'flex';
}

/* ==================== ENVIAR RECHAZO ==================== */
async function submitRechazo(event) {
    event.preventDefault();

    const razon = document.getElementById('razon-rechazo').value.trim();
    
    if (!razon) {
        alert('Por favor, ingresa una razón para el rechazo');
        return;
    }

    if (!solicitudActualModal) {
        alert('No se encontró la solicitud seleccionada');
        return;
    }

    const result = await rejectSolicitud(solicitudActualModal.id, razon);
    if (result.ok) {
        alert(`✓ Solicitud de ${solicitudActualModal.nombre_usuario || 'este solicitante'} ha sido rechazada`);
        document.getElementById('form-rechazo').reset();
        closeRechazarModal();
        await loadAllSolicitudes();
    } else {
        alert(result.error || 'Error al rechazar la solicitud');
    }
}

/* ==================== CERRAR MODALES ==================== */
function closeModal() {
    document.getElementById('detallesModal').style.display = 'none';
}

function closeRechazarModal() {
    document.getElementById('rechazarModal').style.display = 'none';
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', function(event) {
    const modal = document.getElementById('detallesModal');
    const rechazarModal = document.getElementById('rechazarModal');
    
    if (event.target === modal) {
        closeModal();
    }
    if (event.target === rechazarModal) {
        closeRechazarModal();
    }
});

/* ==================== CARGAR EMPLEADOS ==================== */
/* ==================== MOSTRAR EMPLEADOS ==================== */
function displayEmpleados(empleadosList) {
    const container = document.getElementById('empleados-list');
    const emptyState = document.getElementById('no-empleados');

    container.innerHTML = '';

    if (!empleadosList || empleadosList.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    empleadosList.forEach((empleado, index) => {
        const card = createEmpleadoCard(empleado);
        card.style.animationDelay = `${0.05 * index}s`;
        container.appendChild(card);
    });
}

/* ==================== CREAR TARJETA DE EMPLEADO ==================== */
function createEmpleadoCard(empleado) {
    const card = document.createElement('div');
    card.className = 'empleado-card';
    card.style.animation = 'fadeInUp 0.5s ease-out backwards';

    const iniciales = (empleado.nombreCompleto || 'Empleado')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .toUpperCase() || 'EM';

    const especialidadLabel = getEspecialidadLabel(empleado.especialidad || 'Sin especialidad');
    const stars = '⭐'.repeat(Math.round(empleado.rating || 5));

    const disponibilidadHTML = empleado.disponibilidad
        .map(d => getDisponibilidadLabel(d))
        .join(', ');

    card.innerHTML = `
        <div class="empleado-avatar">${iniciales}</div>
        <div class="empleado-nombre">${empleado.nombreCompleto}</div>
        <div class="empleado-id">${empleado.idEmpleado}</div>
        <span class="empleado-especialidad">${especialidadLabel}</span>

        <div class="empleado-detalles">
            <div class="empleado-detalle-item">
                <span class="empleado-detalle-label">Experiencia:</span>
                <span class="empleado-detalle-valor">${empleado.anosExperiencia} años</span>
            </div>
            <div class="empleado-detalle-item">
                <span class="empleado-detalle-label">Disponibilidad:</span>
                <span class="empleado-detalle-valor">${disponibilidadHTML}</span>
            </div>
            <div class="empleado-detalle-item">
                <span class="empleado-detalle-label">Fecha Ingreso:</span>
                <span class="empleado-detalle-valor">${formatDate(empleado.fechaIngreso)}</span>
            </div>
            <div class="empleado-rating">
                <div class="stars">${stars}</div>
            </div>
        </div>
    `;

    return card;
}

/* ==================== FILTRAR EMPLEADOS ==================== */
function filterEmpleados() {
    const searchTerm = document.getElementById('search-empleados').value.toLowerCase();
    const especialidadFilter = document.getElementById('filter-especialidad').value;

    let filteredEmpleados = empleados.slice();

    // Filtrar por búsqueda
    if (searchTerm) {
        filteredEmpleados = filteredEmpleados.filter(e => 
            (e.nombreCompleto || '').toLowerCase().includes(searchTerm) ||
            (e.especialidad || '').toLowerCase().includes(searchTerm) ||
            (e.idEmpleado || '').toString().toLowerCase().includes(searchTerm)
        );
    }

    // Filtrar por especialidad
    if (especialidadFilter) {
        filteredEmpleados = filteredEmpleados.filter(e => e.especialidad === especialidadFilter);
    }

    displayEmpleados(filteredEmpleados);
}

/* ==================== FUNCIONES AUXILIARES ==================== */

// Obtener etiqueta de especialidad
function getEspecialidadLabel(valor) {
    const labels = {
        'desarrollo-web': 'Desarrollo Web',
        'desarrollo-backend': 'Desarrollo Backend',
        'bases-datos': 'Bases de Datos',
        'redes': 'Redes',
        'ciberseguridad': 'Ciberseguridad',
        'soporte-tecnico': 'Soporte Técnico',
        'diseño-ui-ux': 'Diseño UI/UX',
        'reparacion-mantenimiento': 'Reparación y Mantenimiento',
        'servidores': 'Servidores'
    };
    return labels[valor] || valor;
}

// Obtener etiqueta de disponibilidad
function getDisponibilidadLabel(valor) {
    const labels = {
        'tiempo-completo': 'Tiempo completo',
        'medio-tiempo': 'Medio tiempo',
        'freelance': 'Freelance',
        'remoto': 'Remoto',
        'presencial': 'Presencial',
        'hibrido': 'Híbrido'
    };
    return labels[valor] || valor;
}

// Formatear fecha
function formatDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Formatear fecha y hora
function formatDateTime(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/* ==================== CERRAR SESIÓN ==================== */
function logoutAdmin() {
    if (confirm('¿Deseas cerrar la sesión de administrador?')) {
        if (typeof window.logout === 'function') {
            window.logout();
        } else {
            localStorage.removeItem('usuarioActual');
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('adminSession');
            sessionStorage.removeItem('userRole');
            window.location.href = 'login.html';
        }
    }
}

// Hacer funciones globales
window.showModalDetalles = showModalDetalles;
window.showModalAceptar = showModalAceptar;
window.showModalRechazar = showModalRechazar;
window.submitRechazo = submitRechazo;
window.closeModal = closeModal;
window.closeRechazarModal = closeRechazarModal;
window.filterEmpleados = filterEmpleados;
window.logoutAdmin = logoutAdmin;
window.switchTab = switchTab;
