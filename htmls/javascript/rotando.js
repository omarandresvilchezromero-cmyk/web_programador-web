const inicializarCarrusel = () => {
    const contenedor = document.querySelector('.section-productos');
    const btnAnt = document.querySelector('.prev-btn');
    const btnSig = document.querySelector('.next-btn');

    if (!contenedor || !btnAnt || !btnSig) return;

    let posicionActual = 0;

    btnSig.addEventListener('click', e => {
        e.preventDefault();
        posicionActual--;
        contenedor.style.transform = `rotateY(${posicionActual * 120}deg)`;
    });

    btnAnt.addEventListener('click', e => {
        e.preventDefault();
        posicionActual++;
        contenedor.style.transform = `rotateY(${posicionActual * 120}deg)`;
    });
};

const inicializarInteracciones = () => {
    inicializarCarrusel();

    if (typeof window.inicializarRotacionTarjetas === 'function') {
        window.inicializarRotacionTarjetas();
    }
};

document.addEventListener('DOMContentLoaded', inicializarInteracciones);