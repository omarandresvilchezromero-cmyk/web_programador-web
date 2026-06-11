// Sistema de gestión de usuarios con almacenamiento local

class GestorUsuarios {
    constructor() {
        this.claveCuentas = 'cuentasUsuarios';
        this.claveLogueado = 'usuarioLogueado';
    }

    // Generar ID de 4 dígitos único
    generarIdUnique() {
        let id;
        let existente = true;
        while (existente) {
            id = String(Math.floor(Math.random() * 9000) + 1000);
            existente = this.idExiste(id);
        }
        return id;
    }

    // Verificar si un ID ya existe
    idExiste(id) {
        const cuentas = this.cargarCuentas();
        return Object.values(cuentas).some(usuario => usuario.id === id);
    }

    // Cargar todas las cuentas
    cargarCuentas() {
        return JSON.parse(localStorage.getItem(this.claveCuentas) || '{}');
    }

    // Guardar cuentas
    guardarCuentas(cuentas) {
        localStorage.setItem(this.claveCuentas, JSON.stringify(cuentas));
    }

    // Registrar nuevo usuario
    registrarUsuario(nombre, email, contraseña) {
        // Validaciones
        if (!nombre.trim() || !email.trim() || !contraseña.trim()) {
            return { exito: false, mensaje: 'Todos los campos son obligatorios' };
        }

        if (contraseña.length < 6) {
            return { exito: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' };
        }

        // Usar email como identificador de usuario
        const username = email.toLowerCase();
        
        const cuentas = this.cargarCuentas();
        
        // Verificar si el usuario ya existe
        if (cuentas[username]) {
            return { exito: false, mensaje: 'Este email ya está registrado' };
        }

        // Crear nuevo usuario
        const nuevoUsuario = {
            username: username,
            nombre: nombre.trim(),
            email: email.toLowerCase(),
            contraseña: contraseña, // En producción usar hash
            id: this.generarIdUnique(),
            fechaCreacion: new Date().toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
            }),
            displayName: nombre.trim(),
            role: 'Usuario',
            bio: 'Agrega una descripción desde el perfil.',
            photo: 'https://via.placeholder.com/120'
        };

        cuentas[username] = nuevoUsuario;
        this.guardarCuentas(cuentas);

        return { exito: true, mensaje: 'Cuenta creada exitosamente', usuario: nuevoUsuario };
    }

    // Iniciar sesión
    iniciarSesion(email, contraseña) {
        if (!email.trim() || !contraseña.trim()) {
            return { exito: false, mensaje: 'Ingresa email y contraseña' };
        }

        const username = email.toLowerCase();
        const cuentas = this.cargarCuentas();
        const usuario = cuentas[username];

        if (!usuario) {
            return { exito: false, mensaje: 'Usuario no encontrado' };
        }

        if (usuario.contraseña !== contraseña) {
            return { exito: false, mensaje: 'Contraseña incorrecta' };
        }

        // Guardar usuario logueado
        localStorage.setItem(this.claveLogueado, username);
        
        return { exito: true, mensaje: 'Sesión iniciada correctamente', usuario: usuario };
    }

    // Obtener usuario logueado
    obtenerUsuarioLogueado() {
        const username = localStorage.getItem(this.claveLogueado);
        if (!username) return null;

        const cuentas = this.cargarCuentas();
        return cuentas[username] || null;
    }

    // Actualizar perfil del usuario
    actualizarPerfil(nombre, rol, bio) {
        const username = localStorage.getItem(this.claveLogueado);
        if (!username) return { exito: false, mensaje: 'No hay usuario logueado' };

        const cuentas = this.cargarCuentas();
        const usuario = cuentas[username];

        if (!usuario) {
            return { exito: false, mensaje: 'Usuario no encontrado' };
        }

        usuario.displayName = nombre.trim() || usuario.nombre;
        usuario.role = rol.trim() || 'Usuario';
        usuario.bio = bio.trim() || usuario.bio;

        cuentas[username] = usuario;
        this.guardarCuentas(cuentas);

        return { exito: true, mensaje: 'Perfil actualizado', usuario: usuario };
    }

    // Actualizar foto de perfil
    actualizarFoto(fotoBase64) {
        const username = localStorage.getItem(this.claveLogueado);
        if (!username) return { exito: false, mensaje: 'No hay usuario logueado' };

        const cuentas = this.cargarCuentas();
        const usuario = cuentas[username];

        if (!usuario) {
            return { exito: false, mensaje: 'Usuario no encontrado' };
        }

        usuario.photo = fotoBase64;
        cuentas[username] = usuario;
        this.guardarCuentas(cuentas);

        return { exito: true, mensaje: 'Foto actualizada' };
    }

    // Cerrar sesión
    cerrarSesion() {
        localStorage.removeItem(this.claveLogueado);
    }
}

// Crear instancia global
const gestor = new GestorUsuarios();
