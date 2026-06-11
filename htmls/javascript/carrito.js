/* Sistema de Carrito - Frontend */
(function(){
    const CART_KEY = 'cart_v1';

    function getCart(){
        return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    }

    function saveCart(cart){
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        actualizarBadge();
    }

    function actualizarBadge(){
        const cart = getCart();
        const count = cart.reduce((s,i)=>s + (i.quantity||1),0);
        const badge = document.getElementById('badgeCarrito');
        if(!badge) return;
        if(count>0){ badge.style.display='flex'; badge.textContent = count; }
        else badge.style.display='none';
    }

    // Public: agregar al carrito
    window.addToCart = function(item){
        const cart = getCart();
        // Normalizar precio a number
        item.price = Number(String(item.price).replace(/[^0-9\.\-]/g,'')) || 0;
        item.quantity = item.quantity || 1;
        // buscar por referencia
        const idx = cart.findIndex(i => i.ref && item.ref && String(i.ref)===String(item.ref));
        if(idx>=0){ cart[idx].quantity += item.quantity; }
        else cart.push(item);
        saveCart(cart);
        mostrarToast('Añadido al carrito', 'exito');
    }

    window.buyNow = function(item){
        item.quantity = item.quantity || 1;
        addTemporaryAndCheckout(item);
    }

    async function addTemporaryAndCheckout(item){
        // abrir modal y pre-cargar con solo este item
        const confirmed = confirm('Comprar ahora: ' + (item.name || item.title) + '?');
        if(!confirmed) return;
        const sessionResp = await fetch('/api/session', { credentials: 'include' });
        const sessionRaw = await sessionResp.text().catch(() => '');
        console.log('RESPUESTA CRUDA (carrito session temp checkout):', sessionRaw);
        const sessionData = sessionRaw ? JSON.parse(sessionRaw) : null;
        if(!sessionData.user){ window.location.href = '/login.html'; return; }

        const payload = { items: [item] };
        const resp = await fetch('/api/checkout', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        if(resp.ok){ mostrarToast('Compra registrada', 'exito'); clearCart(); }
        else { let e = {}; try { const raw = await resp.text().catch(()=>''); console.log('RESPUESTA CRUDA (carrito addTemporaryAndCheckout error):', raw); e = raw ? JSON.parse(raw) : {}; } catch(err){ e = {}; } mostrarToast('Error al comprar: '+(e.error||resp.statusText),'error'); }
    }

    window.requestQuote = async function(item){
        // Open quote modal prefilled with item info
        openQuoteModal(item);
    }

    function renderCart(){
        const container = document.getElementById('cartItems');
        const totalEl = document.getElementById('cartTotal');
        if(!container || !totalEl) return;
        const cart = getCart();
        container.innerHTML = '';
        if(cart.length===0){ container.innerHTML = '<div style="padding:8px;color:#aaa">Carrito vacío</div>'; totalEl.textContent='$0.00'; return; }
        let total = 0;
        cart.forEach((it, idx)=>{
            const sub = (it.price||0) * (it.quantity||1);
            total += sub;
            const row = document.createElement('div');
            row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center'; row.style.marginBottom='8px';
            row.innerHTML = `<div style="flex:1">
                <div style="font-weight:600">${it.name||it.title||'Item'}</div>
                <div style="font-size:12px;color:#bbb">${it.category||'producto'}</div>
                <div style="font-size:12px;color:#bbb">$${(it.price||0).toFixed(2)} x <span id="qty-${idx}">${it.quantity}</span></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-left:8px;">
                <button data-idx="${idx}" class="increaseQty">+</button>
                <button data-idx="${idx}" class="decreaseQty">-</button>
                <button data-idx="${idx}" class="removeItem">Eliminar</button>
            </div>`;
            container.appendChild(row);
        });
        totalEl.textContent = '$' + total.toFixed(2);

        // attach handlers
        container.querySelectorAll('.increaseQty').forEach(btn=> btn.addEventListener('click', ()=>{ changeQty(btn.dataset.idx,1); }));
        container.querySelectorAll('.decreaseQty').forEach(btn=> btn.addEventListener('click', ()=>{ changeQty(btn.dataset.idx,-1); }));
        container.querySelectorAll('.removeItem').forEach(btn=> btn.addEventListener('click', ()=>{ removeItem(btn.dataset.idx); }));
    }

    function changeQty(idx, delta){
        const cart = getCart();
        idx = Number(idx);
        if(!cart[idx]) return;
        cart[idx].quantity = Math.max(1, (cart[idx].quantity||1) + delta);
        saveCart(cart);
        renderCart();
    }

    function removeItem(idx){
        const cart = getCart();
        cart.splice(Number(idx),1);
        saveCart(cart);
        renderCart();
    }

    function clearCart(){
        localStorage.removeItem(CART_KEY);
        actualizarBadge();
        renderCart();
    }

    window.abrirCarrito = function(){
        const modal = document.getElementById('cartModal');
        if(!modal) return;
        modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
        renderCart();
    }

    // --- NEW: Attach existing buttons on page (adquirir / cotizar) ---
    function detectAndAttachButtons(){
        // selectors to find purchase/acquire buttons
        const adquirirSelectors = ['.btn-adquirir', '.adquirir', 'button'];
        const cotizarSelectors = ['.btn-cotizar', '.btn-cotizacion', '.cotizar'];

        // helper to identify text-based adquirir
        function isAdquirirBtn(el){
            if(!el) return false;
            const cls = (el.className||'').toLowerCase();
            if(cls.includes('adquir') || cls.includes('btn-adquir')) return true;
            const txt = (el.textContent||'').trim().toLowerCase();
            return /^(adquirir|adquirir\b|adquirir\s|adquirir$|adquirir\.)/.test(txt) || txt === 'adquirir' || txt.includes('adquirir') || txt === 'adquirir';
        }

        function isCotizarBtn(el){
            if(!el) return false;
            const cls = (el.className||'').toLowerCase();
            if(cls.includes('cotiz') || cls.includes('btn-cotizar')) return true;
            const txt = (el.textContent||'').trim().toLowerCase();
            return txt === 'cotizar' || txt.includes('cotiz');
        }

        // find all buttons and filter
        document.querySelectorAll('button, a').forEach(btn => {
            try {
                if(isAdquirirBtn(btn)) {
                    btn.addEventListener('click', function(e){ e.preventDefault(); handleAdquirirClick(btn); });
                } else if(isCotizarBtn(btn)) {
                    btn.addEventListener('click', function(e){ e.preventDefault(); handleCotizarClick(btn); });
                }
            } catch(err){ }
        });
    }

    function handleAdquirirClick(btn){
        // find product card ancestor
        const card = btn.closest('article') || btn.closest('.content') || btn.closest('.contentcard') || btn.closest('.content-servicios') || btn.closest('.card') || btn.closest('.section-wrapper') || btn.parentElement;
        if(!card) return mostrarToast('No se encontró el elemento a adquirir','error');
        // try to get name, price, category
        const nameEl = card.querySelector('h3') || card.querySelector('h2') || card.querySelector('.card-title');
        const priceEl = card.querySelector('.price') || card.querySelector('.card-price') || card.querySelector('span.price') || card.querySelector('p.price');
        const name = nameEl ? nameEl.textContent.trim() : (card.getAttribute('data-name') || 'Item');
        const priceText = priceEl ? priceEl.textContent : (card.getAttribute('data-price') || '0');
        const price = Number(String(priceText).replace(/[^0-9\.\-]/g,'')) || 0;

        // detect category by section ancestor
        let category = 'producto';
        if (card.closest('#section-servidor')) category = 'servidor';
        else if (card.closest('#section-seguridad')) category = 'seguridad';
        else if (card.closest('#section-wrapper') || card.closest('.section-wrapper')) category = 'producto';

        const item = { name, price, category, ref: name };
        addToCart(item);
    }

    function handleCotizarClick(btn){
        // detect card and prefill modal
        const card = btn.closest('article') || btn.closest('.content') || btn.closest('.contentcard') || btn.closest('.content-servicios') || btn.closest('.card') || btn.parentElement;
        const nameEl = card ? (card.querySelector('h3') || card.querySelector('h2')) : null;
        const name = nameEl ? nameEl.textContent.trim() : '';
        const category = card && card.closest('#section-servidor') ? 'servidor' : card && card.closest('#section-seguridad') ? 'seguridad' : 'producto';
        openQuoteModal({ name, category });
    }

    // Quote modal utils
    function openQuoteModal(item){
        const modal = document.getElementById('quoteModal');
        if(!modal) return;
        document.getElementById('quoteDesc').value = item.description || item.name || '';
        document.getElementById('quoteName').value = '';
        document.getElementById('quoteEmail').value = '';
        modal.style.display = 'block';
    }

    function closeQuoteModal(){
        const modal = document.getElementById('quoteModal');
        if(modal) modal.style.display = 'none';
    }

    // Wire quote form submit
    document.addEventListener('DOMContentLoaded', ()=>{
        detectAndAttachButtons();
        const form = document.getElementById('quoteForm');
        if(form){
            form.addEventListener('submit', async function(e){
                e.preventDefault();
                const nombre = document.getElementById('quoteName').value.trim();
                const correo = document.getElementById('quoteEmail').value.trim();
                const descripcion = document.getElementById('quoteDesc').value.trim();
                if(!nombre || !correo || !descripcion){ mostrarToast('Completa los campos','error'); return; }

                // verify session
                const sessionResp = await fetch('/api/session', { credentials: 'include' });
                const sessionRaw = await sessionResp.text().catch(() => '');
                console.log('RESPUESTA CRUDA (carrito quote session):', sessionRaw);
                const sessionData = sessionRaw ? JSON.parse(sessionRaw) : null;
                if(!sessionData.user){
                    console.log('REDIRECCION DETECTADA');
                    console.log('Archivo: carrito.js');
                    console.log('Motivo: sesión inválida en cotización');
                    console.log('Usuario:', sessionData.user);
                    console.log('Sesion:', sessionData);
                    window.location.href = '/login.html';
                    return;
                }

                const payload = { categoria: 'general', descripcion };
                const resp = await fetch('/api/cotizaciones', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
                if(resp.ok){ mostrarToast('Cotización enviada','exito'); closeQuoteModal(); }
                else { mostrarToast('Error al enviar cotización','error'); }
            });
        }
        const cancelBtn = document.getElementById('cancelQuoteBtn'); if(cancelBtn) cancelBtn.addEventListener('click', closeQuoteModal);
    });

    // Confirmar compra
    async function confirmarCompra(){
        const cart = getCart();
        if(cart.length===0){ alert('El carrito está vacío'); return; }
        const sessionResp = await fetch('/api/session', { credentials: 'include' });
        const sessionRaw = await sessionResp.text().catch(() => '');
        console.log('RESPUESTA CRUDA (carrito confirmarCompra session):', sessionRaw);
        const sessionData = sessionRaw ? JSON.parse(sessionRaw) : null;
        if(!sessionData.user){
            console.log('REDIRECCION DETECTADA');
            console.log('Archivo: carrito.js');
            console.log('Motivo: sesión inválida en confirmar compra');
            console.log('Usuario:', sessionData.user);
            console.log('Sesion:', sessionData);
            window.location.href = '/login.html';
            return;
        }

        const payload = { items: cart };
        const resp = await fetch('/api/checkout', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        if(resp.ok){ mostrarToast('Compra registrada', 'exito'); clearCart(); }
        else { let e = {}; try { const raw = await resp.text().catch(()=>''); console.log('RESPUESTA CRUDA (carrito confirmarCompra error):', raw); e = raw ? JSON.parse(raw) : {}; } catch(err){ e = {}; } mostrarToast('Error: '+(e.error||resp.statusText),'error'); }
    }

    // Wire buttons
    document.addEventListener('DOMContentLoaded', ()=>{
        actualizarBadge();
        const vacBtn = document.getElementById('vaciarCarritoBtn');
        const confBtn = document.getElementById('confirmarCompraBtn');
        if(vacBtn) vacBtn.addEventListener('click', ()=>{ if(confirm('Vaciar carrito?')) clearCart(); });
        if(confBtn) confBtn.addEventListener('click', confirmarCompra);
    });

    // small toast util
    function mostrarToast(mensaje, tipo){
        if(typeof window.mostrarToast === 'function'){ window.mostrarToast(mensaje, tipo==='exito'?'exito':'error'); return; }
        alert(mensaje);
    }

})();
