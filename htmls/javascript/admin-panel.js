/* =============================================
   PANEL ADMINISTRATIVO - LÓGICA
   ============================================= */

let solicitudActualModal = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar si el usuario es administrador
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) return;

    // Cargar datos iniciales
    loadAllSolicitudes();
    loadAllEmpleados();

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
function loadAllSolicitudes() {
    const solicitudes = window.reclutamiento.getAllSolicitudes();

    const pendientes = solicitudes.filter(s => s.estado === 'pendiente');
    const aceptadas = solicitudes.filter(s => s.estado === 'aceptada');
    const rechazadas = solicitudes.filter(s => s.estado === 'rechazada');

    // Actualizar contadores
    document.getElementById('count-pendientes').textContent = pendientes.length;
    document.getElementById('count-aceptadas').textContent = aceptadas.length;
    document.getElementById('count-rechazadas').textContent = rechazadas.length;

    // Mostrar solicitudes
    displaySolicitudes('pendientes', pendientes);
    displaySolicitudes('aceptadas', aceptadas);
    displaySolicitudes('rechazadas', rechazadas);
}

/* ==================== MOSTRAR SOLICITUDES ==================== */
function displaySolicitudes(tipo, solicitudes) {
    const container = document.getElementById(`${tipo}-list`);
    const emptyState = document.getElementById(`no-${tipo}`);

    // Limpiar contenedor
    container.innerHTML = '';

    if (solicitudes.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    solicitudes.forEach((solicitud, index) => {
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

    const especialidadLabel = getEspecialidadLabel(solicitud.especialidad);
    const estadoBadgeClass = `badge-${solicitud.estado}`;
    const estadoLabel = solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1);

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
    } else if (solicitud.estado === 'aceptada') {
        actionsHTML = `
            <div class="solicitud-actions">
                <button class="btn-action btn-ver-detalles" onclick="showModalDetalles('${solicitud.id}')">
                    Ver Detalles
                </button>
            </div>
        `;
    } else if (solicitud.estado === 'rechazada') {
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
            <div class="solicitud-nombre">${solicitud.nombreCompleto}</div>
            <span class="solicitud-badge ${estadoBadgeClass}">${estadoLabel}</span>
        </div>

        <div class="solicitud-info">
            <div class="info-item">
                <span class="info-label">Especialidad</span>
                <span class="info-value">${especialidadLabel}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Experiencia</span>
                <span class="info-value">${solicitud.anosExperiencia} años</span>
            </div>
            <div class="info-item">
                <span class="info-label">Edad</span>
                <span class="info-value">${solicitud.edad} años</span>
            </div>
            <div class="info-item">
                <span class="info-label">Solicitud</span>
                <span class="info-value">${formatDate(solicitud.fechaSolicitud)}</span>
            </div>
        </div>

        ${actionsHTML}
    `;

    return card;
}

/* ==================== MOSTRAR MODAL DE DETALLES ==================== */
function showModalDetalles(solicitudId) {
    const solicitud = window.reclutamiento.getSolicitudById(solicitudId);
    if (!solicitud) return;

    solicitudActualModal = solicitud;

    const disponibilidadHTML = solicitud.disponibilidad
        .map(d => getDisponibilidadLabel(d))
        .join(', ');

    const especialidadLabel = getEspecialidadLabel(solicitud.especialidad);

    let contenidoAdicional = '';
    if (solicitud.estado === 'aceptada') {
        contenidoAdicional = `
            <div class="detalle">
                <div class="detalle-label">ID de Empleado</div>
                <div class="detalle-valor" style="color: #22D3EE; font-family: monospace;">${solicitud.idEmpleado}</div>
            </div>
            <div class="detalle">
                <div class="detalle-label">Insignia</div>
                <div class="detalle-valor">✓ Empleado Verificado</div>
            </div>
        `;
    } else if (solicitud.estado === 'rechazada') {
        contenidoAdicional = `
            <div class="detalle" style="grid-column: 1 / -1;">
                <div class="detalle-label">Razón del Rechazo</div>
                <div class="detalle-valor">${solicitud.razonRechazo || 'No especificado'}</div>
            </div>
        `;
    }

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h2>${solicitud.nombreCompleto}</h2>

        <div class="modal-detalles">
            <div class="detalle">
                <div class="detalle-label">Estado</div>
                <div class="detalle-valor" style="text-transform: capitalize;">${solicitud.estado}</div>
            </div>
            <div class="detalle">
                <div class="detalle-label">Especialidad</div>
                <div class="detalle-valor">${especialidadLabel}</div>
            </div>
            <div class="detalle">
                <div class="detalle-label">Edad</div>
                <div class="detalle-valor">${solicitud.edad} años</div>
            </div>
            <div class="detalle">
                <div class="detalle-label">Experiencia</div>
                <div class="detalle-valor">${solicitud.anosExperiencia} años</div>
            </div>
            <div class="detalle" style="grid-column: 1 / -1;">
                <div class="detalle-label">Disponibilidad</div>
                <div class="detalle-valor">${disponibilidadHTML}</div>
            </div>
            <div class="detalle" style="grid-column: 1 / -1;">
                <div class="detalle-label">Habilidades Técnicas</div>
                <div class="detalle-valor">${solicitud.habilidades}</div>
            </div>
            <div class="detalle" style="grid-column: 1 / -1;">
                <div class="detalle-label">¿Por qué deseas unirte?</div>
                <div class="detalle-valor">${solicitud.motivacion}</div>
            </div>
            <div class="detalle" style="grid-column: 1 / -1;">
                <div class="detalle-label">Fecha de Solicitud</div>
                <div class="detalle-valor">${formatDateTime(solicitud.fechaSolicitud)}</div>
            </div>

            ${contenidoAdicional}
        </div>
    `;

    document.getElementById('detallesModal').style.display = 'flex';
}

/* ==================== MOSTRAR MODAL ACEPTAR ==================== */
function showModalAceptar(solicitudId) {
    const solicitud = window.reclutamiento.getSolicitudById(solicitudId);
    if (!solicitud) return;

    if (confirm(`¿Aceptar solicitud de ${solicitud.nombreCompleto}?`)) {
        const idEmpleado = window.reclutamiento.acceptSolicitud(solicitudId);
        
        alert(`✓ Solicitud aceptada\n\nID de Empleado: ${idEmpleado}`);
        
        // Recargar datos
        loadAllSolicitudes();
        loadAllEmpleados();
        closeModal();
    }
}

/* ==================== MOSTRAR MODAL RECHAZAR ==================== */
function showModalRechazar(solicitudId) {
    solicitudActualModal = window.reclutamiento.getSolicitudById(solicitudId);
    if (!solicitudActualModal) return;

    document.getElementById('rechazarModal').style.display = 'flex';
}

/* ==================== ENVIAR RECHAZO ==================== */
function submitRechazo(event) {
    event.preventDefault();

    const razon = document.getElementById('razon-rechazo').value.trim();
    
    if (!razon) {
        alert('Por favor, ingresa una razón para el rechazo');
        return;
    }

    window.reclutamiento.rejectSolicitud(solicitudActualModal.id, razon);
    
    alert(`✓ Solicitud de ${solicitudActualModal.nombreCompleto} ha sido rechazada`);
    
    // Limpiar y recargar
    document.getElementById('form-rechazo').reset();
    closeRechazarModal();
    loadAllSolicitudes();
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
function loadAllEmpleados() {
    const empleados = window.reclutamiento.getAllEmployees();
    
    document.getElementById('count-empleados').textContent = empleados.length;

    displayEmpleados(empleados);
}

/* ==================== MOSTRAR EMPLEADOS ==================== */
function displayEmpleados(empleados) {
    const container = document.getElementById('empleados-list');
    const emptyState = document.getElementById('no-empleados');

    container.innerHTML = '';

    if (empleados.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    empleados.forEach((empleado, index) => {
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

    const iniciales = empleado.nombreCompleto
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();

    const especialidadLabel = getEspecialidadLabel(empleado.especialidad);
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

    let empleados = window.reclutamiento.getAllEmployees();

    // Filtrar por búsqueda
    if (searchTerm) {
        empleados = empleados.filter(e => 
            e.nombreCompleto.toLowerCase().includes(searchTerm) ||
            e.especialidad.toLowerCase().includes(searchTerm) ||
            e.idEmpleado.toLowerCase().includes(searchTerm)
        );
    }

    // Filtrar por especialidad
    if (especialidadFilter) {
        empleados = empleados.filter(e => e.especialidad === especialidadFilter);
    }

    displayEmpleados(empleados);
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
