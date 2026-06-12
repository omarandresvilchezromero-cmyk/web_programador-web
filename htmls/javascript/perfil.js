document.addEventListener('DOMContentLoaded', async () => {
    const profileImg = document.getElementById('profile-img');
    const profileName = document.getElementById('profile-name');
    const profileRole = document.getElementById('profile-role');
    const profileId = document.getElementById('id-value');
    const profileEmail = document.getElementById('email-value');
    const profileFecha = document.getElementById('fecha-value');
    const profileBio = document.getElementById('profile-bio');
    const editName = document.getElementById('edit-name');
    const editRole = document.getElementById('edit-role');
    const editBio = document.getElementById('edit-bio');
    const saveButton = document.getElementById('save-profile-btn');
    const logoutButton = document.getElementById('logout-btn');
    const changePhotoButton = document.getElementById('change-photo-btn');
    const photoUpload = document.getElementById('photo-upload');
    const profileBadge = document.getElementById('profile-badge');
    const profileEmployeeId = document.getElementById('profile-employee-id');
    const comprasListEl = document.getElementById('mis-compras-list');

    let usuario = null;
    let empleado = null;

    async function parseJsonSafe(resp) {
        const text = await resp.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (err) {
            console.warn('Respuesta no JSON recibida:', text);
            return null;
        }
    }

    async function fetchProfile() {
        try {
            const resp = await apiFetch('/api/profile');
            const data = await parseJsonSafe(resp);

            if (!resp.ok || !data || !data.ok) {
                console.error('Error en fetch profile, redirigiendo a login');
                window.location.href = 'login.html';
                return;
            }

            usuario = data.user;
            empleado = data.empleado;
            actualizarPerfil();
            fetchCompras();
            window.setCurrentUser(usuario);
        } catch (err) {
            console.error('Error cargando perfil:', err);
            window.location.href = 'login.html';
        }
    }

    async function fetchCompras(){
        if (!comprasListEl) return;
        comprasListEl.textContent = 'Cargando...';
        try{
            const resp = await apiFetch('/api/ventas');
            const data = await parseJsonSafe(resp);
            if (!resp.ok || !data || !data.ok) {
                comprasListEl.textContent = 'No se pudieron cargar las compras.';
                return;
            }
            renderCompras(data.ventas || []);
        }catch(err){
            console.error('Error fetchCompras', err);
            comprasListEl.textContent = 'Error cargando compras.';
        }
    }

    function renderCompras(ventas){
        if (!comprasListEl) return;
        if (!ventas || !ventas.length) {
            comprasListEl.innerHTML = '<p>No tienes compras registradas.</p>';
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'compras-list';
        ventas.forEach(v => {
            const li = document.createElement('li');
            const fecha = v.fecha_compra ? formatearFecha(v.fecha_compra) : 'Fecha desconocida';
            const itemName = v.producto_nombre || v.servicio_servidor_tipo || v.servicio_seguridad_nombre || 'Item';
            li.innerHTML = `<strong>${itemName}</strong> — ${v.cantidad || 1} unidad(es) — $${Number(v.total||0).toFixed(2)} <span style="color:#666; font-size:12px;">(${fecha})</span>`;
            ul.appendChild(li);
        });
        comprasListEl.innerHTML = '';
        comprasListEl.appendChild(ul);
    }

    function actualizarPerfil() {
        if (!usuario) {
            console.error('actualizarPerfil: usuario es null o undefined');
            return;
        }

        console.log('=== DEBUG actualizarPerfil ===');
        console.log('usuario objeto recibido:', JSON.stringify(usuario, null, 2));
        console.log('usuario.id:', usuario.id);
        console.log('usuario.nombre_usuario:', usuario.nombre_usuario);
        console.log('usuario.correoUsuario:', usuario.correoUsuario);
        console.log('usuario.fechaRegistro:', usuario.fechaRegistro);

        profileImg.src = usuario.foto || 'https://via.placeholder.com/120';
        profileName.textContent = usuario.nombre_usuario || 'Usuario';
        const rolNormalizado = (usuario.rol || '').toString().toLowerCase();
        profileRole.textContent = rolNormalizado === 'administrador' ? '⚙️ Administrador' : rolNormalizado === 'empleado' ? '🏢 Empleado Verificado' : '👤 Usuario';
        profileId.textContent = usuario.id;
        profileEmail.textContent = usuario.correoUsuario || '-';
        profileFecha.textContent = usuario.fechaRegistro ? formatearFecha(usuario.fechaRegistro) : 'No disponible';
        profileBio.textContent = usuario.descripcion || 'Agrega una descripción desde el perfil.';

        editName.value = usuario.nombre_usuario || '';
        editRole.value = usuario.especialidad || '';
        editBio.value = usuario.descripcion || '';

        if (rolNormalizado === 'empleado' && empleado) {
            const empleadoRol = empleado.rol || 'Empleado verificado';
            profileBadge.textContent = '✓ ' + empleadoRol;
            profileBadge.style.display = 'block';
            profileEmployeeId.textContent = 'ID Empleado: ' + (empleado.id || empleado.id_usuario || 'N/A');
            profileEmployeeId.style.display = 'block';
        } else {
            profileBadge.style.display = 'none';
            profileEmployeeId.style.display = 'none';
        }
    }

    async function guardarCambios() {
        const nombre = editName.value.trim();
        const especialidad = editRole.value.trim();
        const descripcion = editBio.value.trim();

        if (!nombre) {
            alert('El nombre no puede estar vacío');
            return;
        }

        try {
            const resp = await apiFetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre_usuario: nombre,
                    especialidad,
                    descripcion
                })
            });
            const data = await parseJsonSafe(resp);
            console.log('perfil.js guardarCambios response', { status: resp.status, ok: resp.ok, data });
            if (!resp.ok || !data || !data.ok) {
                alert((data && data.error) || 'Error al guardar cambios');
                return;
            }
            usuario = data.user;
            actualizarPerfil();
            window.setCurrentUser(usuario);
            alert('Perfil actualizado correctamente.');
        } catch (err) {
            console.error('Error actualizando perfil:', err);
            alert('No se pudo guardar el perfil');
        }
    }

    async function guardarFoto(dataUrl) {
        try {
            const resp = await apiFetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ foto: dataUrl })
            });
            const data = await parseJsonSafe(resp);
            console.log('perfil.js guardarFoto response', { status: resp.status, ok: resp.ok, data });
            if (!resp.ok || !data || !data.ok) {
                alert((data && data.error) || 'Error al guardar la foto');
                return;
            }
            usuario = data.user;
            actualizarPerfil();
            window.setCurrentUser(usuario);
            alert('Foto actualizada correctamente');
        } catch (err) {
            console.error('Error guardando foto:', err);
            alert('No se pudo actualizar la foto');
        }
    }

    async function cerrarSesion() {
        try {
            await window.logout();
        } catch (err) {
            console.warn('Error cerrando sesión:', err);
            window.location.href = 'login.html';
        }
    }

    changePhotoButton.addEventListener('click', () => photoUpload.click());
    photoUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => guardarFoto(reader.result);
        reader.readAsDataURL(file);
    });
    saveButton.addEventListener('click', guardarCambios);
    logoutButton.addEventListener('click', () => {
        if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
            cerrarSesion();
        }
    });

    await fetchProfile();
});

function formatearFecha(dateString) {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
