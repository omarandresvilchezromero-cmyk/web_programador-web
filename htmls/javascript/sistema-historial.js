/* =============================================
   SISTEMA DE HISTORIAL ADMINISTRATIVO
   ============================================= */

class SistemaHistorial {
    constructor() {
        this.historialKey = 'historialAdmin';
        this.inicializar();
    }

    inicializar() {
        if (!localStorage.getItem(this.historialKey)) {
            localStorage.setItem(this.historialKey, JSON.stringify([]));
        }
    }

    // Registrar acción
    registrarAccion(datos) {
        const usuarioActual = sistemaUsuarios.obtenerUsuarioActual();
        
        const registro = {
            id: 'HIST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            accion: datos.accion,
            realizadoPor: usuarioActual ? usuarioActual.id : 'SISTEMA',
            realizadoPorNombre: usuarioActual ? usuarioActual.nombre_usuario : 'Sistema',
            usuarioAfectado: datos.usuarioAfectado || null,
            detalles: datos.detalles || '',
            fecha: new Date().toISOString()
        };

        const historial = this.obtenerHistorial();
        historial.push(registro);
        localStorage.setItem(this.historialKey, JSON.stringify(historial));

        return registro;
    }

    // Obtener historial completo
    obtenerHistorial() {
        const historialStr = localStorage.getItem(this.historialKey);
        return historialStr ? JSON.parse(historialStr) : [];
    }

    // Obtener historial de un usuario
    obtenerHistorialUsuario(usuario_id) {
        const historial = this.obtenerHistorial();
        return historial.filter(h => h.usuarioAfectado === usuario_id);
    }

    // Obtener acciones de administrador
    obtenerAccionesAdmin(usuarioAdminId) {
        const historial = this.obtenerHistorial();
        return historial.filter(h => h.realizadoPor === usuarioAdminId);
    }

    // Obtener por tipo de acción
    obtenerPorAccion(tipoAccion) {
        const historial = this.obtenerHistorial();
        return historial.filter(h => h.accion === tipoAccion);
    }

    // Obtener historial reciente
    obtenerReciente(limite = 20) {
        const historial = this.obtenerHistorial();
        return historial.sort((a, b) => 
            new Date(b.fecha) - new Date(a.fecha)
        ).slice(0, limite);
    }

    // Obtener historial en rango de fechas
    obtenerPorFecha(fechaInicio, fechaFin) {
        const historial = this.obtenerHistorial();
        return historial.filter(h => {
            const fecha = new Date(h.fecha);
            return fecha >= new Date(fechaInicio) && fecha <= new Date(fechaFin);
        });
    }

    // Generar reporte administrativo
    generarReporte() {
        const historial = this.obtenerHistorial();
        const acciones = {};
        const adminActions = {};

        historial.forEach(h => {
            // Contar por tipo de acción
            acciones[h.accion] = (acciones[h.accion] || 0) + 1;

            // Contar acciones por admin
            adminActions[h.realizadoPorNombre] = (adminActions[h.realizadoPorNombre] || 0) + 1;
        });

        return {
            totalAcciones: historial.length,
            porAccion: acciones,
            porAdmin: adminActions,
            ultimasAcciones: this.obtenerReciente(10),
            fecha: new Date().toISOString()
        };
    }

    // Exportar historial como JSON
    exportarHistorial() {
        const historial = this.obtenerHistorial();
        const dataStr = JSON.stringify(historial, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `historial-admin-${Date.now()}.json`;
        link.click();

        return { exito: true };
    }

    // Limpiar historial (SOLO ADMIN)
    limpiarHistorial(confirmar = false) {
        if (!confirmar) {
            return { error: 'Operación requiere confirmación' };
        }

        localStorage.setItem(this.historialKey, JSON.stringify([]));
        return { exito: true };
    }

    // Obtener estadísticas
    obtenerEstadisticas() {
        const historial = this.obtenerHistorial();
        const ahora = new Date();
        const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);

        const ultimas24h = historial.filter(h => new Date(h.fecha) > hace24h);
        const acciones = {};

        historial.forEach(h => {
            acciones[h.accion] = (acciones[h.accion] || 0) + 1;
        });

        return {
            totalRegistros: historial.length,
            ultimas24h: ultimas24h.length,
            acciones: acciones,
            ultimaActividad: historial.length > 0 ? historial[historial.length - 1].fecha : null
        };
    }
}

// Instancia global
const sistemaHistorial = new SistemaHistorial();

        let isRegistro = false;

        // Toggle entre login y registro
        document.getElementById('toggle-mode').addEventListener('click', function(e) {
            e.preventDefault();
            isRegistro = !isRegistro;

            const title = document.getElementById('login-title');
            const submitBtn = document.getElementById('submit-button');
            const modeText = document.getElementById('mode-text');
            const usuarioGroup = document.getElementById('usuario-group');
            const nombreGroup = document.getElementById('nombre-group');
            const emailGroup = document.getElementById('email-group');
            const confirmGroup = document.getElementById('confirm-password-group');
            const usuarioInput = document.getElementById('usuario');
            const passwordInput = document.getElementById('password');

            if (isRegistro) {
                title.textContent = 'Crear Cuenta';
                submitBtn.textContent = 'REGISTRARSE';
                modeText.innerHTML = '¿Ya tienes cuenta? <a href="#" id="toggle-mode">Inicia sesión</a>';
                usuarioGroup.style.display = 'block';
                nombreGroup.style.display = 'block';
                emailGroup.style.display = 'block';
                confirmGroup.style.display = 'block';
                usuarioInput.placeholder = '';
                passwordInput.placeholder = '';
            } else {
                title.textContent = 'Iniciar Sesión';
                submitBtn.textContent = 'ENTRAR';
                modeText.innerHTML = '¿No tienes cuenta? <a href="#" id="toggle-mode">Crear una</a>';
                usuarioGroup.style.display = 'block';
                nombreGroup.style.display = 'none';
                emailGroup.style.display = 'none';
                confirmGroup.style.display = 'none';
                usuarioInput.placeholder = '';
                passwordInput.placeholder = '';
            }

            // Readd listener
            document.getElementById('toggle-mode').addEventListener('click', arguments.callee);
            document.getElementById('form-autenticacion').reset();
            limpiarMensajes();
        });

        // Toggle mostrar contraseña
        document.getElementById('toggle-password').addEventListener('click', function(e) {
            e.preventDefault();
            const input = document.getElementById('password');
            const btn = this;
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'Ocultar';
            } else {
                input.type = 'password';
                btn.textContent = 'Mostrar';
            }
        });

        document.getElementById('toggle-confirm-password')?.addEventListener('click', function(e) {
            e.preventDefault();
            const input = document.getElementById('confirm-password');
            const btn = this;
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'Ocultar';
            } else {
                input.type = 'password';
                btn.textContent = 'Mostrar';
            }
        });

        // Submit form
        document.getElementById('form-autenticacion').addEventListener('submit', function(e) {
            e.preventDefault();
            limpiarMensajes();

            if (isRegistro) {
                hacerRegistro();
            } else {
                hacerLogin();
            }
        });

        const apiFetch = (url, options = {}) => {
            console.log('apiFetch ejecutado', url);
            // Si existe window.apiFetch y no somos nosotros mismos, delegar a la implementación global
            if (window.apiFetch && window.apiFetch !== apiFetch) {
                return window.apiFetch(url, options);
            }
            // Fallback directo a fetch usando API_URL si está disponible
            const finalUrl = (window.API_URL && typeof window.API_URL === 'function') ? window.API_URL(url) : url;
            return fetch(finalUrl, Object.assign({ credentials: 'include' }, options));
        };

        async function hacerLogin() {
            const usuario = document.getElementById('usuario').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!usuario || !password) {
                mostrarError('Por favor completa todos los campos');
                return;
            }

            const payload = {
                correoUsuario: usuario.includes('@') ? usuario : undefined,
                nombre_usuario: usuario.includes('@') ? undefined : usuario,
                contrasenia: password
            };

            console.log('LOGIN ENVIADO:', payload);
            console.log('FETCH LOGIN URL:', '/api/login');
            console.log('FETCH LOGIN METHOD:', 'POST');
            console.log('FETCH LOGIN HEADERS:', { 'Content-Type': 'application/json' });
            console.log('FETCH LOGIN BODY:', JSON.stringify(payload));

            try {
                const response = await apiFetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const text = await response.text();
                let data = null;
                try { data = text ? JSON.parse(text) : null; } catch (e) { console.warn('PARSE ERROR (login):', e); }
                console.log('RESPUESTA CRUDA LOGIN:', { status: response.status, text, parsed: data });
                console.log('RESPUESTA LOGIN:', data);
                if (!response.ok) {
                    console.log('DATA RECIBIDA (login):', data);
                    mostrarError((data && data.error) ? data.error : 'Error en el inicio de sesión');
                    return;
                }

                syncLocalSession(data.user);
                mostrarExito('¡Bienvenido ' + data.user.nombre_usuario + '!');
                setTimeout(() => {
                    if (data.user.rol && data.user.rol.toLowerCase().includes('admin')) {
                        logRedirect('Login exitoso - rol admin', data.user, data);
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        logRedirect('Login exitoso - rol usuario', data.user, data);
                        window.location.href = 'perfil.html';
                    }
                }, 800);
            } catch (error) {
                console.error(error);
                mostrarError('Error de red: ' + (error.message || error));
            }
        }

        async function hacerRegistro() {
            const nombre = document.getElementById('nombre').value.trim();
            const usuario = document.getElementById('usuario').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();

            if (!nombre || !usuario || !email || !password || !confirmPassword) {
                mostrarError('Por favor completa todos los campos');
                return;
            }

            if (password !== confirmPassword) {
                mostrarError('Las contraseñas no coinciden');
                return;
            }

            if (password.length < 6) {
                mostrarError('La contraseña debe tener al menos 6 caracteres');
                return;
            }

            try {
                const response = await apiFetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre_usuario: usuario,
                        correoUsuario: email,
                        contrasenia: password,
                        nombre_completo: nombre
                    })
                });

                const text = await response.text();
                console.log('RESPUESTA CRUDA (register):', text);
                const data = text ? JSON.parse(text) : null;
                if (!response.ok) {
                    console.log('DATA RECIBIDA (register):', data);
                    mostrarError((data && data.error) ? data.error : 'Error al registrarse');
                    return;
                }

                syncLocalSession(data.user);
                mostrarExito('¡Registro exitoso! Redirigiendo a tu perfil...');
                setTimeout(() => {
                    isRegistro = false;
                    document.getElementById('form-autenticacion').reset();
                    document.getElementById('login-title').textContent = 'Iniciar Sesión';
                    document.getElementById('submit-button').textContent = 'ENTRAR';
                    document.getElementById('mode-text').innerHTML = '¿No tienes cuenta? <a href="#" id="toggle-mode">Crear una</a>';
                    document.getElementById('usuario-group').style.display = 'block';
                    document.getElementById('nombre-group').style.display = 'none';
                    document.getElementById('email-group').style.display = 'none';
                    document.getElementById('confirm-password-group').style.display = 'none';
                    limpiarMensajes();
                    logRedirect('Registro exitoso', data.user, data);
                    window.location.href = 'perfil.html';
                }, 1500);
            } catch (error) {
                console.error(error);
                mostrarError('Error de red: ' + (error.message || error));
            }
        }

        function mostrarError(mensaje) {
            const container = document.getElementById('mensaje-contenedor');
            container.innerHTML = '<div class="mensaje-error">❌ ' + mensaje + '</div>';
        }

        function mostrarExito(mensaje) {
            const container = document.getElementById('mensaje-contenedor');
            container.innerHTML = '<div class="mensaje-exito">✅ ' + mensaje + '</div>';
        }

        function limpiarMensajes() {
            document.getElementById('mensaje-contenedor').innerHTML = '';
        }

        function logRedirect(motivo, usuario, data) {
            console.log('REDIRECCION DETECTADA');
            console.log('Archivo: login.html');
            console.log('Motivo:', motivo);
            console.log('Usuario:', usuario);
            console.log('Sesion:', data);
        }

        function syncLocalSession(user) {
            if (!user) return;

            const compatibleUser = {
                id: user.id,
                nombreCompleto: user.nombre_usuario || user.nombreCompleto || '',
                nombre_usuario: user.nombre_usuario || user.nombreCompleto || '',
                email: user.correoUsuario || user.email || '',
                rol: user.rol || 'usuario',
                estado: user.estado || 'activo',
                foto: user.foto || '👤',
                descripcion: user.descripcion || '',
                fechaRegistro: user.fechaRegistro || new Date().toISOString(),
                especialidad: user.especialidad || ''
            };

            window.setCurrentUser(compatibleUser);
            localStorage.removeItem('usuarioLogueado');
        }

        window.addEventListener('load', async function() {
            try {
                const response = await apiFetch('/api/session');
                const text = await response.text();
                console.log('RESPUESTA CRUDA (session):', text);
                const data = text ? JSON.parse(text) : null;
                console.log('SESSION ACTUAL:', data);
                if (data && data.user) {
                    syncLocalSession(data.user);
                    if (data.user.rol && data.user.rol.toLowerCase().includes('admin')) {
                        logRedirect('Login page detectó sesión activa - rol admin', data.user, data);
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        logRedirect('Login page detectó sesión activa - rol usuario', data.user, data);
                        window.location.href = 'perfil.html';
                    }
                }
            } catch (error) {
                console.warn('No se pudo verificar sesión:', error);
            }
        });
