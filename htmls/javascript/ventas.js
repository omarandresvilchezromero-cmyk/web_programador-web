(function(){
  const productosEl = document.getElementById('productos');
  const serviciosServidorEl = document.getElementById('servicios-servidor');
  const serviciosSeguridadEl = document.getElementById('servicios-seguridad');
  const carritoList = document.getElementById('carrito-list');
  const carritoTotalEl = document.getElementById('carrito-total');
  const checkoutBtn = document.getElementById('checkout');
  const clearCartBtn = document.getElementById('clear-cart');
  const checkoutResult = document.getElementById('checkout-result');

  let carrito = [];

  function formatMoney(n){ return Number(n).toFixed(2); }

  function renderCarrito(){
    carritoList.innerHTML = '';
    if (!carrito.length) {
      const empty = document.createElement('li');
      empty.className = 'cart-empty';
      empty.textContent = 'El carrito está vacío';
      carritoList.appendChild(empty);
      carritoTotalEl.textContent = '0.00';
      return;
    }

    carrito.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'cart-item';

      const info = document.createElement('div');
      info.innerHTML = `<strong>${item.label}</strong><small>${item.cantidad} x $${formatMoney(item.precio)} = $${formatMoney(item.subtotal)}</small>`;

      const actions = document.createElement('div');
      actions.className = 'cart-actions';
      const qty = document.createElement('input');
      qty.type = 'number';
      qty.min = 1;
      qty.value = item.cantidad;
      qty.className = 'qty-input';
      qty.addEventListener('change', async () => {
        const nuevaCantidad = Math.max(1, Number(qty.value) || 1);
        await updateCartItem(item.itemKey, nuevaCantidad);
      });

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Eliminar';
      removeBtn.className = 'btn btn-secondary';
      removeBtn.addEventListener('click', async () => {
        await removeCartItem(item.itemKey);
      });

      actions.appendChild(qty);
      actions.appendChild(removeBtn);
      li.appendChild(info);
      li.appendChild(actions);
      carritoList.appendChild(li);
    });

    carritoTotalEl.textContent = formatMoney(carrito.reduce((sum, item) => sum + Number(item.subtotal || 0), 0));
  }

  async function fetchJSON(url, options = {}){
    const res = await fetch(url, { credentials: 'include', ...options });
    return res.json();
  }

  function createCard(item, type){
    const el = document.createElement('article');
    el.className = 'card';
    const title = document.createElement('h3');
    title.textContent = item.nombre || item.tipo || item.nombre_producto || item.titulo || 'Item';
    const p = document.createElement('p');
    p.textContent = item.descripcion || item.resumen || item.detalle || '';
    const price = document.createElement('div');
    price.className = 'card-price';
    price.textContent = '$' + formatMoney(item.precio);
    const controls = document.createElement('div');
    controls.className = 'card-controls';
    const qty = document.createElement('input'); qty.type = 'number'; qty.value = 1; qty.min = 1; qty.className = 'qty-input';
    const btn = document.createElement('button'); btn.textContent = 'Agregar'; btn.className = 'btn btn-buy';
    btn.addEventListener('click', async ()=>{
      const cantidad = Math.max(1, Number(qty.value) || 1);
      await addToCart(type, item.id_producto || item.id_servicio || item.id || item.id_servicio, cantidad);
    });
    controls.appendChild(qty);
    controls.appendChild(btn);
    el.appendChild(title);
    el.appendChild(p);
    el.appendChild(price);
    el.appendChild(controls);
    return el;
  }

  async function loadCatalogo(){
    try{
      const productosResp = await fetchJSON('/api/productos');
      if (productosResp.ok && productosResp.productos){
        productosResp.productos.forEach(p => productosEl.appendChild(createCard(p, 'producto')));
      }

      const servidorResp = await fetchJSON('/api/servicios/servidores');
      if (servidorResp.ok && servidorResp.servicios) servidorResp.servicios.forEach(s => serviciosServidorEl.appendChild(createCard(s, 'servidor')));

      const seguridadResp = await fetchJSON('/api/servicios/seguridad');
      if (seguridadResp.ok && seguridadResp.servicios) seguridadResp.servicios.forEach(s => serviciosSeguridadEl.appendChild(createCard(s, 'seguridad')));
    }catch(err){
      console.error(err); alert('Error cargando catálogo');
    }
  }

  async function loadCart(){
    try{
      const data = await fetchJSON('/api/carrito');
      if (data.ok) {
        carrito = data.cart || [];
        carritoTotalEl.textContent = formatMoney(data.total || 0);
        renderCarrito();
      }
    } catch (err) {
      console.error('Error cargando carrito', err);
    }
  }

  async function addToCart(type, id, cantidad){
    try{
      const data = await fetchJSON('/api/carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, cantidad })
      });
      if (data.ok) {
        carrito = data.cart || [];
        carritoTotalEl.textContent = formatMoney(data.total || 0);
        renderCarrito();
        checkoutResult.textContent = 'Artículo agregado al carrito';
      } else {
        checkoutResult.textContent = 'Error: ' + (data.error || 'No se pudo agregar');
      }
    } catch (err) {
      console.error(err);
      checkoutResult.textContent = 'Error de red al agregar al carrito';
    }
  }

  async function updateCartItem(itemKey, cantidad){
    try{
      const data = await fetchJSON(`/api/carrito/${encodeURIComponent(itemKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad })
      });
      if (data.ok) {
        carrito = data.cart || [];
        carritoTotalEl.textContent = formatMoney(data.total || 0);
        renderCarrito();
        checkoutResult.textContent = 'Cantidad actualizada';
      } else {
        checkoutResult.textContent = 'Error: ' + (data.error || 'No se pudo actualizar');
      }
    } catch (err) {
      console.error(err);
      checkoutResult.textContent = 'Error de red al actualizar carrito';
    }
  }

  async function removeCartItem(itemKey){
    try{
      const data = await fetchJSON(`/api/carrito/${encodeURIComponent(itemKey)}`, { method: 'DELETE' });
      if (data.ok) {
        carrito = data.cart || [];
        carritoTotalEl.textContent = formatMoney(data.total || 0);
        renderCarrito();
        checkoutResult.textContent = 'Artículo eliminado';
      } else {
        checkoutResult.textContent = 'Error: ' + (data.error || 'No se pudo eliminar');
      }
    } catch (err) {
      console.error(err);
      checkoutResult.textContent = 'Error de red al eliminar artículo';
    }
  }

  async function clearCart(){
    try{
      const promises = carrito.map(item => fetchJSON(`/api/carrito/${encodeURIComponent(item.itemKey)}`, { method: 'DELETE' }));
      const results = await Promise.all(promises);
      if (results.every(r => r.ok)) {
        carrito = [];
        renderCarrito();
        checkoutResult.textContent = 'Carrito vaciado';
      }
    } catch (err) {
      console.error(err);
      checkoutResult.textContent = 'Error al vaciar el carrito';
    }
  }

  checkoutBtn.addEventListener('click', async ()=>{
    if (!carrito.length) return alert('Carrito vacío');
    checkoutBtn.disabled = true;
    checkoutResult.textContent = 'Procesando pago...';
    try{
      const data = await fetchJSON('/api/venta', { method: 'POST' });
      if (data.ok) {
        carrito = [];
        renderCarrito();
        carritoTotalEl.textContent = '0.00';
        checkoutResult.textContent = 'Compra registrada. Total: $' + formatMoney(data.total);
      } else {
        checkoutResult.textContent = 'Error: ' + (data.error || 'No se pudo procesar la compra');
      }
    } catch (err) {
      console.error(err);
      checkoutResult.textContent = 'Error en la compra';
    } finally {
      checkoutBtn.disabled = false;
    }
  });

  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', async () => {
      await clearCart();
    });
  }

  loadCatalogo();
  loadCart();
})();
