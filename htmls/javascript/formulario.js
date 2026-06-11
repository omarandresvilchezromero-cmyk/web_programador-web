async function getBackendSessionUser() {
    try {
        const txt = await (await apiFetch('/api/session')).text();
        console.log('RESPUESTA CRUDA (formulario session):', txt);
        const data = txt ? JSON.parse(txt) : null;
        return data.user || null;
    } catch (error) {
        console.warn('Error verificando sesión en backend:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.querySelector('form[name="vacante"]');
    if (!formulario) return;

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = await getBackendSessionUser();
        if (!user) {
            alert('Debes iniciar sesión antes de postularte.');
            console.log('REDIRECCION DETECTADA');
            console.log('Archivo: formulario.js');
            console.log('Motivo: no hay sesión activa en backend');
            console.log('Usuario:', user);
            console.log('Sesion backend:', user);
            window.location.href = 'login.html';
            return;
        }

        const username = user.nombre_usuario || user.correoUsuario || 'usuario';
        const boton = formulario.querySelector('.btn-submit');
        boton.textContent = 'Guardando solicitud...';
        boton.disabled = true;

        const nuevaSolicitud = {
            id: Date.now(),
            username,
            nombre: formulario.nombre.value.trim(),
            fecha: formulario.fecha.value,
            descripcion: formulario.descripcion.value.trim(),
            carrera: formulario.carrera.value,
            experiencia: formulario.experiencia.value.trim(),
            createdAt: new Date().toISOString()
        };

        const solicitudes = JSON.parse(localStorage.getItem('solicitudesEmpleo') || '[]');
        const yaExiste = solicitudes.some(item => item.username === username);
        if (yaExiste) {
            alert('Ya tienes una solicitud pendiente. Espera la respuesta de Omar.');
            boton.textContent = 'Enviar Postulación';
            boton.disabled = false;
            return;
        }

        solicitudes.push(nuevaSolicitud);
        localStorage.setItem('solicitudesEmpleo', JSON.stringify(solicitudes));

        alert('Tu solicitud fue enviada a Omar. Cuando te acepte, recibirás la insignia de empleado.');
        formulario.reset();
        boton.textContent = 'Enviar Postulación';
        boton.disabled = false;
    });
});