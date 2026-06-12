/*
 Carousel stabilization script
 - Calculate card width once
 - Force cards to same width and layout horizontally
 - Use translateX on the container to change visible card
 - Block clicks during transition and prevent index overflow
 - Log card sizes before/after transition
 - Do not modify product onclick handlers
*/

const inicializarCarrusel = () => {
    const viewer = document.querySelector('.carousel-viewer');
    const contenedor = document.querySelector('.section-productos');
    const btnAnt = document.querySelector('.prev-btn');
    const btnSig = document.querySelector('.next-btn');

    if (!viewer || !contenedor || !btnAnt || !btnSig) return;

    const cards = Array.from(contenedor.querySelectorAll('.contentcard'));
    if (!cards.length) return;

    // compute gap (fallback to 20 if not available)
    const computed = window.getComputedStyle(contenedor);
    let gap = parseInt(computed.columnGap || computed.gap || 20, 10) || 20;

    // compute cardWidth once based on viewer width to keep stable layout
    const cardWidth = viewer.clientWidth;

    // enforce layout: convert contenedor to horizontal flex and normalize cards
    contenedor.style.display = 'flex';
    contenedor.style.flexWrap = 'nowrap';
    contenedor.style.alignItems = 'stretch';
    contenedor.style.transition = 'transform 0.48s cubic-bezier(.2,.9,.2,1)';
    contenedor.style.willChange = 'transform';
    contenedor.style.boxSizing = 'border-box';
    contenedor.style.gap = gap + 'px';
    contenedor.style.position = 'relative';

    cards.forEach((card) => {
        // override absolute / 3D transforms from CSS to make stable horizontal layout
        card.style.position = 'relative';
        card.style.transform = 'none';
        card.style.left = '0';
        card.style.top = '0';
        card.style.minWidth = cardWidth + 'px';
        card.style.maxWidth = cardWidth + 'px';
        card.style.boxSizing = 'border-box';
        card.style.overflow = 'hidden';
    });

    let currentIndex = 0;
    let isAnimating = false;

    function clampIndex(i){
        return Math.max(0, Math.min(i, cards.length - 1));
    }

    function logCardSizes(tag){
        try{
            console.log('CARRUSEL LOG -', tag);
            cards.forEach((card, i) => {
                const w = card.offsetWidth;
                const h = card.offsetHeight;
                const r = card.getBoundingClientRect();
                console.log(`card[${i}] offset: ${w}x${h}, rect: ${Math.round(r.width)}x${Math.round(r.height)}@(${Math.round(r.left)},${Math.round(r.top)})`);
            });
        }catch(err){ console.warn('logCardSizes error', err); }
    }

    function goToIndex(target){
        target = clampIndex(target);
        if (isAnimating || target === currentIndex) return;
        isAnimating = true;
        logCardSizes('before goToIndex ' + target);

        const translateX = -(target * (cardWidth + gap));
        contenedor.style.transform = `translateX(${translateX}px)`;

        const onEnd = (ev) => {
            if (ev.propertyName !== 'transform') return;
            contenedor.removeEventListener('transitionend', onEnd);
            currentIndex = target;
            // small timeout to allow layout to settle then clear animating
            setTimeout(() => {
                isAnimating = false;
                logCardSizes('after goToIndex ' + target);
            }, 10);
        };

        contenedor.addEventListener('transitionend', onEnd);
    }

    // prevent double-binding by replacing buttons with clones
    const newBtnSig = btnSig.cloneNode(true);
    const newBtnAnt = btnAnt.cloneNode(true);
    btnSig.parentNode.replaceChild(newBtnSig, btnSig);
    btnAnt.parentNode.replaceChild(newBtnAnt, btnAnt);

    newBtnSig.addEventListener('click', (e) => {
        e.preventDefault();
        goToIndex(currentIndex + 1);
    });

    newBtnAnt.addEventListener('click', (e) => {
        e.preventDefault();
        goToIndex(currentIndex - 1);
    });

    // expose helper for debugging
    window.__carousel = { goToIndex, getCurrent: () => currentIndex, cardWidth };
};

const inicializarInteracciones = () => {
    inicializarCarrusel();

    if (typeof window.inicializarRotacionTarjetas === 'function') {
        window.inicializarRotacionTarjetas();
    }
};

document.addEventListener('DOMContentLoaded', inicializarInteracciones);