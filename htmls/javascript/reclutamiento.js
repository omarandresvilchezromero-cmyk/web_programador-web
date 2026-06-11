/* =============================================
   SISTEMA DE RECLUTAMIENTO INTERNO - LÓGICA
   ============================================= */

document.addEventListener('DOMContentLoaded', async function() {
    const form = document.getElementById('solicitudEquipo');
    const successMessage = document.getElementById('successMessage');
    const adminLink = document.getElementById('adminLink');

    // Verificar si el usuario es administrador
    await checkAdminStatus();

    // Event listener para el formulario
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Agregar efectos de animación a los campos al cargar
    addFieldAnimations();

    // Validación en tiempo real
    addRealTimeValidation();
});

/* ==================== VERIFICAR ESTADO DE ADMINISTRADOR ==================== */
async function checkAdminStatus() {
    const adminLink = document.getElementById('adminLink');
    if (!adminLink) return;

    try {
        const response = await apiFetch('/api/session');
        const raw = await response.text().catch(() => '');
        console.log('RESPUESTA CRUDA (reclutamiento session):', raw);
        const data = raw ? JSON.parse(raw) : null;
        const usuarioActual = data && data.user;

        if (usuarioActual && usuarioActual.rol && (usuarioActual.rol.toLowerCase() === 'administrador' || usuarioActual.rol.toLowerCase() === 'admin')) {
            adminLink.style.display = 'inline-block';
            window.setCurrentUser(usuarioActual);
            return;
        }
    } catch (error) {
        console.warn('No se pudo verificar administración:', error);
    }

    localStorage.removeItem('usuarioActual');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminSession');
    adminLink.style.display = 'none';
}

/* ==================== MANEJAR ENVÍO DEL FORMULARIO ==================== */
async function handleFormSubmit(e) {
    e.preventDefault();

    // Validar formulario
    if (!validateForm()) {
        return;
    }

    // Recopilar datos del formulario
    const formData = collectFormData();

    // Intentar enviar al servidor; si falla, guardar localmente
    const sent = await sendToServer(formData);
    if (!sent) {
        saveSolicitud(formData);
        showSuccessMessage();
        document.getElementById('solicitudEquipo').reset();
        return;
    }

    // Enviado correctamente
    showSuccessMessage();
    document.getElementById('solicitudEquipo').reset();
}

/* ==================== VALIDAR FORMULARIO ==================== */
function validateForm() {
    const nombreCompleto = document.getElementById('nombreCompleto');
    const fechaNacimiento = document.getElementById('fechaNacimiento');
    const especialidad = document.getElementById('especialidad');
    const anosExperiencia = document.getElementById('anosExperiencia');
    const habilidades = document.getElementById('habilidades');
    const motivacion = document.getElementById('motivacion');
    const disponibilidad = document.querySelectorAll('input[name="disponibilidad"]:checked');

    let isValid = true;

    // Limpiar errores previos
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

    // Validar nombre completo
    if (!nombreCompleto.value.trim()) {
        showError('nombreCompleto', 'El nombre es requerido');
        isValid = false;
    } else if (nombreCompleto.value.trim().length < 5) {
        showError('nombreCompleto', 'El nombre debe tener al menos 5 caracteres');
        isValid = false;
    }

    // Validar fecha de nacimiento
    if (!fechaNacimiento.value) {
        showError('fechaNacimiento', 'La fecha de nacimiento es requerida');
        isValid = false;
    } else {
        const age = calculateAge(new Date(fechaNacimiento.value));
        if (age < 18) {
            showError('fechaNacimiento', 'Debes ser mayor de 18 años');
            isValid = false;
        }
    }

    // Validar especialidad
    if (!especialidad.value) {
        showError('especialidad', 'Selecciona una especialidad');
        isValid = false;
    }

    // Validar años de experiencia
    if (!anosExperiencia.value) {
        showError('anosExperiencia', 'Los años de experiencia son requeridos');
        isValid = false;
    } else if (anosExperiencia.value < 0 || anosExperiencia.value > 60) {
        showError('anosExperiencia', 'Ingresa un valor válido entre 0 y 60');
        isValid = false;
    }

    // Validar habilidades
    if (!habilidades.value.trim()) {
        showError('habilidades', 'Describe tus habilidades técnicas');
        isValid = false;
    } else if (habilidades.value.trim().length < 20) {
        showError('habilidades', 'Describe con más detalle tus habilidades (mínimo 20 caracteres)');
        isValid = false;
    }

    // Validar disponibilidad
    if (disponibilidad.length === 0) {
        showError('disponibilidad', 'Selecciona al menos una opción de disponibilidad');
        isValid = false;
    }

    // Validar motivación
    if (!motivacion.value.trim()) {
        showError('motivacion', 'Cuéntanos por qué deseas formar parte del equipo');
        isValid = false;
    } else if (motivacion.value.trim().length < 30) {
        showError('motivacion', 'Sé más específico sobre tu motivación (mínimo 30 caracteres)');
        isValid = false;
    }

    return isValid;
}

/* ==================== MOSTRAR ERROR EN CAMPO ==================== */
function showError(fieldId, message) {
    const errorElement = document.getElementById(`error-${fieldId}`);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

/* ==================== CALCULAR EDAD ==================== */
function calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

/* ==================== RECOPILAR DATOS DEL FORMULARIO ==================== */
function collectFormData() {
    const disponibilidadSeleccionada = Array.from(
        document.querySelectorAll('input[name="disponibilidad"]:checked')
    ).map(el => el.value);

    return {
        id: generateSolicitudId(),
        nombreCompleto: document.getElementById('nombreCompleto').value.trim(),
        fechaNacimiento: document.getElementById('fechaNacimiento').value,
        edad: calculateAge(new Date(document.getElementById('fechaNacimiento').value)),
        especialidad: document.getElementById('especialidad').value,
        anosExperiencia: parseInt(document.getElementById('anosExperiencia').value),
        habilidades: document.getElementById('habilidades').value.trim(),
        disponibilidad: disponibilidadSeleccionada,
        motivacion: document.getElementById('motivacion').value.trim(),
        estado: 'pendiente',
        fechaSolicitud: new Date().toISOString(),
        idEmpleado: null,
        insignia: null,
        razonRechazo: null
    };
}

/* ==================== GENERAR ID DE SOLICITUD ==================== */
function generateSolicitudId() {
    return 'SOL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

/* ==================== GUARDAR SOLICITUD ==================== */
function saveSolicitud(solicitud) {
    try {
        // Obtener solicitudes previas
        let solicitudes = JSON.parse(localStorage.getItem('solicitudesEquipo')) || [];

        // Agregar nueva solicitud
        solicitudes.push(solicitud);

        // Guardar en localStorage
        localStorage.setItem('solicitudesEquipo', JSON.stringify(solicitudes));

        // Guardar copia con timestamp para backup
        const backup = {
            timestamp: new Date().toLocaleString('es-ES'),
            solicitud: solicitud
        };
        let backups = JSON.parse(localStorage.getItem('solicitudesBackup')) || [];
        backups.push(backup);
        localStorage.setItem('solicitudesBackup', JSON.stringify(backups));

        console.log('✓ Solicitud guardada exitosamente:', solicitud.id);
        
        // En un servidor real, aquí enviarías los datos a una API
        // sendToServer(solicitud);
    } catch (error) {
        console.error('Error al guardar solicitud:', error);
        alert('Hubo un error al procesar tu solicitud. Por favor, intenta nuevamente.');
    }
}

/* ==================== MOSTRAR MENSAJE DE ÉXITO ==================== */
function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    successMessage.style.display = 'flex';

    // Ocultar automáticamente después de 5 segundos
    setTimeout(() => {
        // No ocultamos automáticamente para permitir que el usuario vea el mensaje
    }, 5000);
}

/* ==================== AGREGAR ANIMACIONES A CAMPOS ==================== */
function addFieldAnimations() {
    const inputs = document.querySelectorAll('.form-group input, .form-group select, .form-group textarea');
    
    inputs.forEach((input, index) => {
        input.style.animationDelay = `${0.1 * (index + 1)}s`;

        // Efecto de enfoque
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateY(-2px)';
        });

        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'translateY(0)';
        });
    });
}

/* ==================== VALIDACIÓN EN TIEMPO REAL ==================== */
function addRealTimeValidation() {
    const nombreCompleto = document.getElementById('nombreCompleto');
    const fechaNacimiento = document.getElementById('fechaNacimiento');
    const especialidad = document.getElementById('especialidad');
    const anosExperiencia = document.getElementById('anosExperiencia');
    const habilidades = document.getElementById('habilidades');
    const motivacion = document.getElementById('motivacion');

    // Validar nombre en tiempo real
    if (nombreCompleto) {
        nombreCompleto.addEventListener('blur', function() {
            if (this.value.trim().length < 5 && this.value.trim().length > 0) {
                showError('nombreCompleto', 'Mínimo 5 caracteres');
            } else {
                document.getElementById('error-nombreCompleto').textContent = '';
            }
        });
    }

    // Validar fecha de nacimiento
    if (fechaNacimiento) {
        fechaNacimiento.addEventListener('change', function() {
            if (this.value) {
                const age = calculateAge(new Date(this.value));
                if (age < 18) {
                    showError('fechaNacimiento', 'Debes ser mayor de 18 años');
                } else {
                    document.getElementById('error-fechaNacimiento').textContent = '';
                }
            }
        });
    }

    // Validar habilidades
    if (habilidades) {
        habilidades.addEventListener('blur', function() {
            if (this.value.trim().length < 20 && this.value.trim().length > 0) {
                showError('habilidades', 'Mínimo 20 caracteres');
            } else {
                document.getElementById('error-habilidades').textContent = '';
            }
        });
    }

    // Validar motivación
    if (motivacion) {
        motivacion.addEventListener('blur', function() {
            if (this.value.trim().length < 30 && this.value.trim().length > 0) {
                showError('motivacion', 'Mínimo 30 caracteres');
            } else {
                document.getElementById('error-motivacion').textContent = '';
            }
        });
    }
}

/* ==================== FUNCIONES PARA EL SERVIDOR ==================== */
// Enviar solicitud al backend vía fetch. Devuelve true si se envió correctamente.
async function sendToServer(solicitud) {
    try {
        const payload = {
            especialidad: solicitud.especialidad,
            experiencia: solicitud.anosExperiencia,
            descripcion: solicitud.habilidades + '\nMotivación: ' + solicitud.motivacion
        };

        const response = await apiFetch('/api/solicitudes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('Solicitud enviada al servidor');
            return true;
        }

        if (response.status === 401) {
            // No autenticado
            alert('Debe iniciar sesión para enviar la solicitud');
            console.log('REDIRECCION DETECTADA');
            console.log('Archivo: reclutamiento.js');
            console.log('Motivo: 401 al enviar solicitud');
            console.log('Usuario:', sessionStorage.getItem('username') || localStorage.getItem('usuarioActual'));
            console.log('Sesion:', await response.text().catch(() => '[no body]'));
            window.location.href = 'login.html';
            return false;
        }

        let err = {};
        try {
            const raw = await response.text().catch(() => '');
            console.log('RESPUESTA CRUDA (reclutamiento sendToServer error):', raw);
            err = raw ? JSON.parse(raw) : {};
        } catch (e) { err = {}; }
        console.error('Error al enviar solicitud:', err);
        return false;
    } catch (error) {
        console.error('Error de conexión:', error);
        return false;
    }
}

/* ==================== FUNCIONES AUXILIARES ==================== */
// Obtener todas las solicitudes
function getAllSolicitudes() {
    return JSON.parse(localStorage.getItem('solicitudesEquipo')) || [];
}

// Obtener solicitud por ID
function getSolicitudById(id) {
    const solicitudes = getAllSolicitudes();
    return solicitudes.find(sol => sol.id === id);
}

// Actualizar estado de solicitud
function updateSolicitudStatus(id, nuevoEstado, idEmpleado = null, insignia = null) {
    const solicitudes = getAllSolicitudes();
    const solicitud = solicitudes.find(sol => sol.id === id);
    
    if (solicitud) {
        solicitud.estado = nuevoEstado;
        if (idEmpleado) solicitud.idEmpleado = idEmpleado;
        if (insignia) solicitud.insignia = insignia;
        
        localStorage.setItem('solicitudesEquipo', JSON.stringify(solicitudes));
        console.log('✓ Solicitud actualizada:', id);
    }
}

// Rechazar solicitud
function rejectSolicitud(id, razon) {
    const solicitudes = getAllSolicitudes();
    const solicitud = solicitudes.find(sol => sol.id === id);
    
    if (solicitud) {
        solicitud.estado = 'rechazada';
        solicitud.razonRechazo = razon;
        
        localStorage.setItem('solicitudesEquipo', JSON.stringify(solicitudes));
        console.log('✓ Solicitud rechazada:', id);
    }
}

// Aceptar solicitud y crear empleado
function acceptSolicitud(id) {
    const solicitudes = getAllSolicitudes();
    const solicitud = solicitudes.find(sol => sol.id === id);
    
    if (solicitud) {
        // Generar ID de empleado
        const idEmpleado = generateEmployeeId();
        
        // Crear registro de empleado
        createEmployeeRecord(solicitud, idEmpleado);
        
        // Actualizar solicitud
        solicitud.estado = 'aceptada';
        solicitud.idEmpleado = idEmpleado;
        solicitud.insignia = 'empleado-verificado-' + idEmpleado;
        
        localStorage.setItem('solicitudesEquipo', JSON.stringify(solicitudes));
        console.log('✓ Solicitud aceptada y empleado creado:', idEmpleado);
        
        return idEmpleado;
    }
}

// Generar ID de empleado
function generateEmployeeId() {
    return 'EMP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Crear registro de empleado
function createEmployeeRecord(solicitud, idEmpleado) {
    try {
        let empleados = JSON.parse(localStorage.getItem('empleados')) || [];
        
        const empleado = {
            idEmpleado: idEmpleado,
            nombreCompleto: solicitud.nombreCompleto,
            fechaNacimiento: solicitud.fechaNacimiento,
            edad: solicitud.edad,
            especialidad: solicitud.especialidad,
            anosExperiencia: solicitud.anosExperiencia,
            habilidades: solicitud.habilidades,
            disponibilidad: solicitud.disponibilidad,
            insignia: 'empleado-verificado-' + idEmpleado,
            fechaIngreso: new Date().toISOString(),
            estado: 'activo',
            rating: 5.0,
            solicitudId: solicitud.id
        };
        
        empleados.push(empleado);
        localStorage.setItem('empleados', JSON.stringify(empleados));
        
        console.log('✓ Empleado registrado:', idEmpleado);
        return empleado;
    } catch (error) {
        console.error('Error al crear registro de empleado:', error);
    }
}

// Obtener todos los empleados
function getAllEmployees() {
    return JSON.parse(localStorage.getItem('empleados')) || [];
}

/* ==================== EXPORTAR FUNCIONES ==================== */
window.reclutamiento = {
    getAllSolicitudes,
    getSolicitudById,
    updateSolicitudStatus,
    rejectSolicitud,
    acceptSolicitud,
    getAllEmployees
};
