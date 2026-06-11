document.addEventListener('DOMContentLoaded', () => {
    const ADMIN_USERNAME = 'omar';
    const ADMIN_PASSWORD = '78899889';
    const STORAGE_KEY = 'productosAdmin';
    const AUTH_KEY = 'adminAuthenticated';
    const PRIMARY_ADMIN_EMAIL = 'omarandresvilchezromero@gmail.com';

    const btnAddPost = document.getElementById('btnAddPost');
    const adminModal = document.getElementById('adminModal');
    const closeAdminModal = document.getElementById('closeAdminModal');
    const adminLoginPanel = document.getElementById('adminLoginPanel');
    const adminProductPanel = document.getElementById('adminProductPanel');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    const adminLoginMessage = document.getElementById('adminLoginMessage');
    const productMessage = document.getElementById('productMessage');

    const fields = {
        username: document.getElementById('adminUsername'),
        password: document.getElementById('adminPassword'),
        title: document.getElementById('productTitle'),
        description: document.getElementById('productDescription'),
        cpu: document.getElementById('productCpu'),
        ram: document.getElementById('productRam'),
        price: document.getElementById('productPrice'),
        badge: document.getElementById('productBadge'),
        icon: document.getElementById('productIcon'),
    };

    const dynamicProductsContainer = document.getElementById('dynamicProducts');

    const getSavedProducts = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    };

    const isAdminAuthenticated = () => localStorage.getItem(AUTH_KEY) === 'true';

    const setAuthenticated = (value) => {
        localStorage.setItem(AUTH_KEY, value ? 'true' : 'false');
    };

    const isUserAdmin = (user) => {
        const username = user ? (user.nombre_usuario || user.username || '').toString().toLowerCase() : '';
        const role = user ? (user.rol || user.role || '').toString().toLowerCase() : '';
        const email = user ? (user.correoUsuario || user.email || '').toString().toLowerCase() : '';
        return username === 'admin' || role === 'administrador' || role === 'admin' || email === PRIMARY_ADMIN_EMAIL;
    };

    const verifyAdminSession = async (showErrors = true) => {
        try {
            const resp = await fetch('/api/session', { credentials: 'include' });
            const raw = await resp.text().catch(() => '');
            console.log('RESPUESTA CRUDA (publicar verifyAdminSession):', raw);
            const data = raw ? JSON.parse(raw) : null;
            const user = data.user;
            const isAdmin = isUserAdmin(user);
            setAuthenticated(isAdmin);
            if (!isAdmin && showErrors) {
                adminLoginMessage.textContent = 'No tienes permisos para agregar publicaciones.';
                adminLoginMessage.className = 'admin-message error';
            }
            return isAdmin;
        } catch (err) {
            if (showErrors) {
                adminLoginMessage.textContent = 'Error verificando permisos.';
                adminLoginMessage.className = 'admin-message error';
            }
            setAuthenticated(false);
            return false;
        }
    };

    const closeModal = () => {
        adminModal.classList.add('hidden');
        adminModal.setAttribute('aria-hidden', 'true');
        adminLoginMessage.textContent = '';
        productMessage.textContent = '';
    };

    const openModal = () => {
        adminModal.classList.remove('hidden');
        adminModal.setAttribute('aria-hidden', 'false');
        adminLoginMessage.textContent = '';
        productMessage.textContent = '';
        if (isAdminAuthenticated()) {
            adminLoginPanel.classList.add('hidden');
            adminProductPanel.classList.remove('hidden');
        } else {
            adminLoginPanel.classList.remove('hidden');
            adminProductPanel.classList.add('hidden');
        }
    };

    const renderProductCard = (product) => {
        const card = document.createElement('article');
        card.className = 'contentcard dynamic-card';
        card.innerHTML = `
            <div class="card-badge">${product.badge}</div>
            <div class="card-icon">${product.icon}</div>
            <h3>${product.title}</h3>
            <p class="description">${product.description}</p>
            <div class="specs-grid">
                <span><strong>CPU:</strong> ${product.cpu}</span>
                <span><strong>RAM:</strong> ${product.ram}</span>
            </div>
            <div class="card-action">
                <span class="price">${product.price}</span>
                <button class="btn-cotizar">Cotizar</button>
            </div>
        `;
        dynamicProductsContainer.appendChild(card);
    };

    const loadSavedProducts = () => {
        dynamicProductsContainer.innerHTML = '';
        getSavedProducts().forEach(renderProductCard);
    };

    const saveProduct = async () => {
        const isAdmin = await verifyAdminSession(false);
        if (!isAdmin) {
            productMessage.textContent = 'No tienes permisos para crear publicaciones.';
            productMessage.className = 'admin-message error';
            return;
        }

        const title = fields.title.value.trim();
        const description = fields.description.value.trim();
        const cpu = fields.cpu.value.trim();
        const ram = fields.ram.value.trim();
        const price = fields.price.value.trim();
        const badge = fields.badge.value.trim() || 'En Stock';
        const icon = fields.icon.value.trim() || '🖥️';

        if (!title || !description || !cpu || !ram || !price) {
            productMessage.textContent = 'Completa todos los campos para guardar el producto.';
            productMessage.className = 'admin-message error';
            return;
        }

        const product = { title, description, cpu, ram, price, badge, icon };

        // server-side permission check and persist
        try {
            const resp = await fetch('/api/admin/posts', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });

            if (resp.status === 403) {
                productMessage.textContent = 'No tienes permisos para crear publicaciones.';
                productMessage.className = 'admin-message error';
                return;
            }

            if (!resp.ok) {
                productMessage.textContent = 'Error al crear publicación en el servidor.';
                productMessage.className = 'admin-message error';
                return;
            }
        } catch (err) {
            productMessage.textContent = 'Error de red al contactar el servidor.';
            productMessage.className = 'admin-message error';
            return;
        }

        // If server allowed, save locally and render
        const products = getSavedProducts();
        products.push(product);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
        renderProductCard(product);

        fields.title.value = '';
        fields.description.value = '';
        fields.cpu.value = '';
        fields.ram.value = '';
        fields.price.value = '';
        fields.badge.value = '';
        fields.icon.value = '';

        productMessage.textContent = 'Producto creado.';
        productMessage.className = 'admin-message success';
    };

    // server-aware click handler: double-check permissions before opening modal
    btnAddPost.addEventListener('click', async () => {
        const isAdmin = await verifyAdminSession();
        if (!isAdmin) return;
        openModal();
    });

    closeAdminModal.addEventListener('click', closeModal);
    adminModal.addEventListener('click', (event) => {
        if (event.target === adminModal) closeModal();
    });

    adminLoginBtn.addEventListener('click', () => {
        const username = fields.username.value.trim().toLowerCase();
        const password = fields.password.value.trim();

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            setAuthenticated(true);
            adminLoginPanel.classList.add('hidden');
            adminProductPanel.classList.remove('hidden');
            adminLoginMessage.textContent = 'Acceso aprobado. Ya puedes agregar productos.';
            adminLoginMessage.className = 'admin-message success';
            fields.username.value = '';
            fields.password.value = '';
        } else {
            adminLoginMessage.textContent = 'Usuario o contraseña incorrectos.';
            adminLoginMessage.className = 'admin-message error';
        }
    });

    adminLogoutBtn.addEventListener('click', () => {
        setAuthenticated(false);
        adminProductPanel.classList.add('hidden');
        adminLoginPanel.classList.remove('hidden');
        adminLoginMessage.textContent = 'Sesión cerrada. Ingresa como admin para continuar.';
        adminLoginMessage.className = 'admin-message';
    });

    document.getElementById('saveProductBtn').addEventListener('click', saveProduct);

    loadSavedProducts();
    // check session and toggle admin button visibility on load
    const checkSessionAndToggleAdmin = async () => {
        const isAdmin = await verifyAdminSession(false);
        if (isAdmin) {
            btnAddPost.style.display = '';
            btnAddPost.setAttribute('aria-hidden', 'false');
        } else {
            btnAddPost.style.display = 'none';
            btnAddPost.setAttribute('aria-hidden', 'true');
        }
    };

    checkSessionAndToggleAdmin();
});