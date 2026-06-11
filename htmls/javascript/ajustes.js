document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.settings-group-header');
    const group = document.querySelector('.settings-group');
    const subitems = document.querySelectorAll('.settings-subitem');

    // Desplegar o colapsar el menú de ajustes
    header.addEventListener('click', () => {
        group.classList.toggle('active');
    });

    // Controlar acciones individuales con funciones flecha
    subitems.forEach(item => {
        item.addEventListener('click', async () => {
            const accion = item.getAttribute('data-action');

            switch(accion) {
                case 'notificaciones':
                    alert("Configurando alertas de infraestructura del servidor...");
                    // Aquí puedes abrir un modal o cambiar estados de alertas
                    break;
                    
                case 'idioma':
                    alert("Región y lenguaje: Cambiando preferencias del sistema...");
                    break;
                    
                case 'otra-cuenta':
                    console.log("Cambiando token de sesión...");
                    console.log('REDIRECCION DETECTADA');
                    console.log('Archivo: ajustes.js');
                    console.log('Motivo: cambiar a otra cuenta');
                    console.log('Usuario:', localStorage.getItem('usuarioActual'));
                    console.log('Sesion:', null);
                    window.location.href = "login.html"; 
                    break;
                    
                case 'cerrar-sesion':
                    try {
                        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                    } catch (error) {
                        console.warn('Error cerrando sesión en el servidor:', error);
                    }
                    localStorage.removeItem('usuarioLogueado');
                    localStorage.removeItem('usuarioActual');
                    localStorage.removeItem('sessionToken');
                    localStorage.removeItem('isAdmin');
                    localStorage.removeItem('adminSession');
                    alert("Cierre de sesión seguro completado.");
                    console.log('REDIRECCION DETECTADA');
                    console.log('Archivo: ajustes.js');
                    console.log('Motivo: logout desde ajustes');
                    console.log('Usuario:', null);
                    console.log('Sesion:', '[logout]');
                    window.location.href = "login.html"; 
                    break;
            }

            // Colapsa el menú lateral automáticamente tras la acción
            group.classList.remove('active');
        });
    });
});