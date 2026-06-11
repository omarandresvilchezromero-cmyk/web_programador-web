const http = require('http');
const https = require('https');

async function testBrowserFlow() {
  console.log('=== SIMULANDO FLUJO DEL NAVEGADOR ===\n');

  let sessionCookie = null;

  // Step 1: Login
  console.log('PASO 1: POST /api/login');
  const loginPayload = JSON.stringify({
    correoUsuario: 'debugging@test.com',
    contrasenia: 'test123456'
  });

  try {
    const loginResp = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: loginPayload,
      credentials: 'include' // Important: allows cookies
    });

    console.log('Status:', loginResp.status);
    console.log('Headers:', {
      'set-cookie': loginResp.headers.get('set-cookie'),
      'content-type': loginResp.headers.get('content-type')
    });

    const loginData = await loginResp.json();
    console.log('Response body:', JSON.stringify(loginData, null, 2));

    // Extract cookie from Set-Cookie header
    const setCookie = loginResp.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0]; // Get just the cookie part
      console.log('\n✓ Cookie extraída:', sessionCookie);
    }

  } catch (err) {
    console.error('Error en login:', err.message);
    return;
  }

  // Step 2: Try GET /api/profile with cookie
  console.log('\n\nPASO 2: GET /api/profile (con cookie)');

  if (!sessionCookie) {
    console.log('ERROR: No hay cookie para enviar');
    return;
  }

  try {
    const profileResp = await fetch('http://localhost:3000/api/profile', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': sessionCookie // Send the cookie back
      },
      credentials: 'include' // Important: preserves cookies
    });

    console.log('Status:', profileResp.status);
    console.log('Headers:', {
      'content-type': profileResp.headers.get('content-type')
    });

    const profileData = await profileResp.json();
    console.log('Response body:', JSON.stringify(profileData, null, 2));

    if (profileResp.status === 200) {
      console.log('\n✓ FLUJO EXITOSO - Datos del usuario recibidos');
    } else {
      console.log('\n✗ ERROR - El servidor retornó status', profileResp.status);
    }

  } catch (err) {
    console.error('Error en profile:', err.message);
  }

  // Step 3: Test /api/session endpoint
  console.log('\n\nPASO 3: GET /api/session (con cookie)');

  try {
    const sessionResp = await fetch('http://localhost:3000/api/session', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': sessionCookie
      },
      credentials: 'include'
    });

    console.log('Status:', sessionResp.status);
    const sessionData = await sessionResp.json();
    console.log('Response body:', JSON.stringify(sessionData, null, 2));

  } catch (err) {
    console.error('Error en session:', err.message);
  }
}

testBrowserFlow().catch(console.error);
