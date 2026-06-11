/**
 * Manejador de UI para login.html
 * Integra el formulario HTML con el sistema de autenticación oficial
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-autenticacion');
    const loginBox = document.querySelector('.login-box');
    const loginTitle = document.getElementById('login-title');
    const toggleModeLink = document.getElementById('toggle-mode');
    const submitButton = document.getElementById('submit-button');
    const modeText = document.getElementById('mode-text');
    const mensajeContenedor = document.getElementById('mensaje-contenedor');
    
    // Elementos de entrada
    const usuarioInput = document.getElementById('usuario');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const nombreInput = document.getElementById('nombre');
    
    // Grupos de entrada
    const usuarioGroup = document.getElementById('usuario-group');
    const nombreGroup = document.getElementById('nombre-group');
    const emailGroup = document.getElementById('email-group');
    const confirmPasswordGroup = document.getElementById('confirm-password-group');
    
    // Toggles de contraseña
    const togglePassword = document.getElementById('toggle-password');
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
    
    let esModoRegistro = false;

    // Alternar entre login y registro
    function cambiarModo() {
        esModoRegistro = !esModoRegistro;
        
        if (esModoRegistro) {
            // MODO REGISTRO
            loginTitle.textContent = 'Crear Cuenta';
            submitButton.textContent = 'REGISTRAR';
            usuarioGroup.style.display = 'block';
            nombreGroup.style.display = 'block';
            emailGroup.style.display = 'block';
            confirmPasswordGroup.style.display = 'block';
            usuarioInput.required = true;
            nombreInput.required = true;
            emailInput.required = true;
            modeText.innerHTML = '¿Ya tienes cuenta? <a href="#" id="toggle-mode">Inicia sesión</a>';
        } else {
            // MODO LOGIN
            loginTitle.textContent = 'Iniciar Sesión';
            submitButton.textContent = 'ENTRAR';
            usuarioGroup.style.display = 'none';
            nombreGroup.style.display = 'none';
            emailGroup.style.display = 'none';
            confirmPasswordGroup.style.display = 'none';
            usuarioInput.required = false;
            nombreInput.required = false;
            emailInput.required = false;
            modeText.innerHTML = '¿No tienes cuenta? <a href="#" id="toggle-mode">Crear una</a>';
        }
        
        form.reset();
        mensajeContenedor.innerHTML = '';
        
        // Reasignar eventos al nuevo enlace
        document.getElementById('toggle-mode').addEventListener('click', (e) => {
            e.preventDefault();
            cambiarModo();
        });
    }

    // Evento inicial para toggle
    toggleModeLink.addEventListener('click', (e) => {
        e.preventDefault();
        cambiarModo();
    });

    // Mostrar/Ocultar contraseña
    togglePassword.addEventListener('click', (e) => {
        e.preventDefault();
        const tipo = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = tipo;
        togglePassword.textContent = tipo === 'password' ? 'Mostrar' : 'Ocultar';
    });

    // Mostrar/Ocultar confirmar contraseña
    toggleConfirmPassword.addEventListener('click', (e) => {
        e.preventDefault();
        const tipo = confirmPasswordInput.type === 'password' ? 'text' : 'password';
        confirmPasswordInput.type = tipo;
        toggleConfirmPassword.textContent = tipo === 'password' ? 'Mostrar' : 'Ocultar';
    });

    // Manejar envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        mensajeContenedor.innerHTML = '';
        submitButton.disabled = true;
        
        if (esModoRegistro) {
            // MODO REGISTRO
            await manejarRegistro();
        } else {
            // MODO LOGIN
            await manejarLogin();
        }
        
        submitButton.disabled = false;
    });

    async function manejarRegistro() {
        const usuario = usuarioInput.value.trim();
        const nombre = nombreInput.value.trim();
        const email = emailInput.value.trim();
        const contraseña = passwordInput.value;
        const confirmarContraseña = confirmPasswordInput.value;

        // Validaciones
        if (!usuario || !nombre || !email || !contraseña || !confirmarContraseña) {
            mostrarMensaje('Todos los campos son obligatorios', false);
            return;
        }

        if (contraseña !== confirmarContraseña) {
            mostrarMensaje('Las contraseñas no coinciden', false);
            return;
        }

        if (contraseña.length < 6) {
            mostrarMensaje('La contraseña debe tener al menos 6 caracteres', false);
            return;
        }

        console.log('📝 Registrando usuario:', { usuario, nombre, email });
        submitButton.textContent = 'REGISTRANDO...';
        submitButton.style.filter = 'hue-rotate(90deg)';

        const resultado = await autenticacion.registrar(usuario, email, contraseña);
        
        submitButton.textContent = 'REGISTRAR';
        submitButton.style.filter = '';

        if (resultado.exito) {
            mostrarMensaje(`✅ ¡Cuenta creada exitosamente!`, true);
            console.log('✅ Usuario registrado:', resultado.usuario);
            
            setTimeout(() => {
                // Redirigir al test-auth para que complete el login
                window.location.href = 'test-auth.html';
            }, 1500);
        } else {
            loginBox.style.animation = 'shake 0.5s';
            setTimeout(() => loginBox.style.animation = '', 500);
            mostrarMensaje(resultado.error, false);
        }
    }

    async function manejarLogin() {
        const email = usuarioInput.value.trim();
        const contraseña = passwordInput.value;

        if (!email || !contraseña) {
            mostrarMensaje('Ingresa email/usuario y contraseña', false);
            return;
        }

        console.log('🔐 Iniciando sesión:', { email });
        submitButton.textContent = 'CONECTANDO...';
        submitButton.style.filter = 'hue-rotate(90deg)';

        const resultado = await autenticacion.login(email, contraseña);
        
        submitButton.textContent = 'ENTRAR';
        submitButton.style.filter = '';

        if (resultado.exito) {
            mostrarMensaje(`✅ ¡Bienvenido, ${resultado.usuario.nombre_usuario}!`, true);
            console.log('✅ Login exitoso:', resultado.usuario);
            
            setTimeout(() => {
                // Redirigir al perfil
                window.location.href = 'perfil.html';
            }, 1500);
        } else {
            loginBox.style.animation = 'shake 0.5s';
            setTimeout(() => loginBox.style.animation = '', 500);
            mostrarMensaje(resultado.error, false);
        }
    }

    function mostrarMensaje(texto, esExito) {
        const clase = esExito ? 'mensaje-exito' : 'mensaje-error';
        mensajeContenedor.innerHTML = `<div class="${clase}">${texto}</div>`;
    }

    // Animación shake para errores
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
});
