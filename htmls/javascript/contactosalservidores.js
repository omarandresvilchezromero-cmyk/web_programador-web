document.addEventListener('DOMContentLoaded', () => {
    const currentUser = sistemaUsuarios.obtenerUsuarioActual();
    const isAdmin = currentUser && currentUser.rol && (currentUser.rol.toLowerCase() === 'administrador' || currentUser.rol.toLowerCase() === 'admin');
    const employeeList = document.getElementById('employeeList');
    const requestsContainer = document.getElementById('adminRequests');

    const STORAGE_KEYS = {
        accounts: 'cuentasUsuarios',
        requests: 'solicitudesEmpleo',
        employees: 'empleadosServidor'
    };

    const DEFAULT_EMPLOYEES = [
        
    ];

    const loadData = (key, fallback) => JSON.parse(localStorage.getItem(key) || fallback);
    const saveData = (key, value) => localStorage.setItem(key, JSON.stringify(value));

    const loadAccounts = () => loadData(STORAGE_KEYS.accounts, '{}');
    const saveAccounts = (accounts) => saveData(STORAGE_KEYS.accounts, accounts);
    const loadRequests = () => loadData(STORAGE_KEYS.requests, '[]');
    const saveRequests = (requests) => saveData(STORAGE_KEYS.requests, requests);
    const loadEmployees = () => loadData(STORAGE_KEYS.employees, 'null');
    const saveEmployees = (employees) => saveData(STORAGE_KEYS.employees, employees);

    const nextId = (items) => items.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;

    const getStoredEmployees = () => {
        const saved = loadEmployees();
        if (!Array.isArray(saved) || saved.length === 0) {
            saveEmployees(DEFAULT_EMPLOYEES);
            return [...DEFAULT_EMPLOYEES];
        }
        return saved;
    };

    const syncEmployeeAccounts = (employees) => {
        const cuentas = loadAccounts();
        Object.values(cuentas).forEach((cuenta) => {
            if (cuenta.role === 'Empleado') {
                const existe = employees.some(emp => emp.nombre === cuenta.username);
                if (!existe) {
                    employees.push({
                        id: nextId(employees),
                        employeeId: cuenta.employeeId || nextId(employees),
                        nombre: cuenta.username,
                        rol: 'Empleado',
                        badge: cuenta.badge || 'Empleado oficial',
                        avatar: cuenta.photo || 'https://via.placeholder.com/50',
                        estado: 'online'
                    });
                }
            }
        });
        saveEmployees(employees);
        return employees;
    };

    const renderEmployeeList = () => {
        const employees = syncEmployeeAccounts(getStoredEmployees());
        employeeList.innerHTML = '';

        employees.forEach((empleado) => {
            employeeList.innerHTML += `
                <div class="employee-row" data-id="${empleado.id}">
                    <div class="avatar-container" onclick="togglePopover(this)">
                        <img src="${empleado.avatar}" alt="Avatar" class="avatar-img">
                        <span class="status-dot ${empleado.estado}"></span>
                        <div class="popover-menu">
                            <span class="popover-username">${empleado.nombre}</span>
                            <button class="popover-btn view-profile">Ver Perfil</button>
                        </div>
                    </div>
                    <div class="employee-info">
                        <span class="employee-name">${empleado.nombre}</span>
                        <span class="employee-role">${empleado.rol}</span>
                        ${empleado.employeeId ? `<span class="employee-meta">ID ${empleado.employeeId}</span>` : ''}
                        ${empleado.badge ? `<span class="employee-badge">${empleado.badge}</span>` : ''}
                    </div>
                    <div class="employee-action">
                        <button class="chat-btn">
                            <span class="chat-icon">💬</span> Hablar
                        </button>
                    </div>
                </div>
            `;
        });
    };

    const renderRequests = () => {
        if (!requestsContainer) return;

        const solicitudes = loadRequests();
        if (!isAdmin) {
            requestsContainer.innerHTML = `
                <p class="empty-message">Solo Omar puede revisar y aceptar solicitudes de empleado.</p>
            `;
            return;
        }

        if (solicitudes.length === 0) {
            requestsContainer.innerHTML = `
                <p class="empty-message">No hay solicitudes pendientes.</p>
            `;
            return;
        }

        requestsContainer.innerHTML = '';
        solicitudes.forEach((solicitud) => {
            const card = document.createElement('div');
            card.className = 'request-card';
            card.innerHTML = `
                <div class="request-card-header">
                    <strong>${solicitud.username}</strong> solicita ser empleado
                </div>
                <div class="request-card-body">
                    <p><strong>Puesto:</strong> ${solicitud.nombre}</p>
                    <p><strong>Carrera:</strong> ${solicitud.carrera}</p>
                    <p><strong>Descripción:</strong> ${solicitud.descripcion}</p>
                    <p><strong>Experiencia:</strong> ${solicitud.experiencia}</p>
                    <p><strong>Fecha:</strong> ${new Date(solicitud.createdAt).toLocaleString('es-ES')}</p>
                </div>
                <div class="request-card-actions">
                    <button class="btn-accept" data-id="${solicitud.id}">Aceptar</button>
                    <button class="btn-reject" data-id="${solicitud.id}">Rechazar</button>
                </div>
            `;
            requestsContainer.appendChild(card);
        });

        requestsContainer.querySelectorAll('.btn-accept').forEach((button) => {
            button.addEventListener('click', () => {
                const id = Number(button.dataset.id);
                handleRequestApproval(id, true);
            });
        });

        requestsContainer.querySelectorAll('.btn-reject').forEach((button) => {
            button.addEventListener('click', () => {
                const id = Number(button.dataset.id);
                handleRequestApproval(id, false);
            });
        });
    };

    const handleRequestApproval = (requestId, accepted) => {
        let solicitudes = loadRequests();
        const solicitud = solicitudes.find(item => item.id === requestId);
        if (!solicitud) return;

        solicitudes = solicitudes.filter(item => item.id !== requestId);
        saveRequests(solicitudes);

        if (accepted) {
            const cuentas = loadAccounts();
            const usuario = cuentas[solicitud.username] || {
                username: solicitud.username,
                displayName: solicitud.username,
                role: 'Empleado',
                bio: 'Empleado del servidor',
                photo: 'https://via.placeholder.com/120',
                badge: 'Empleado oficial',
                employeeId: null
            };

            usuario.role = 'Empleado';
            usuario.badge = 'Empleado oficial';
            const empleados = getStoredEmployees();
            const assignedEmployeeId = nextId(empleados);
            usuario.employeeId = usuario.employeeId || assignedEmployeeId;
            cuentas[solicitud.username] = usuario;
            saveAccounts(cuentas);

            if (!empleados.some(emp => emp.nombre === solicitud.username)) {
                empleados.push({
                    id: assignedEmployeeId,
                    employeeId: usuario.employeeId,
                    nombre: solicitud.username,
                    rol: 'Empleado',
                    badge: usuario.badge,
                    avatar: usuario.photo || 'https://via.placeholder.com/50',
                    estado: 'online'
                });
                saveEmployees(empleados);
            }

            alert(`El usuario ${solicitud.username} ahora tiene la insignia de empleado y el ID ${usuario.employeeId}.`);
        }

        renderEmployeeList();
        renderRequests();
    };

    window.togglePopover = (elemento) => {
        const popover = elemento.querySelector('.popover-menu');
        document.querySelectorAll('.popover-menu').forEach(menu => {
            if (menu !== popover) {
                menu.style.display = 'none';
            }
        });
        popover.style.display = popover.style.display === 'flex' ? 'none' : 'flex';
    };

    renderEmployeeList();
    renderRequests();
});
