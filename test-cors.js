async function testCORSPreflight() {
  console.log('=== TESTING CORS PREFLIGHT REQUEST ===\n');

  try {
    // Test OPTIONS preflight for GET /api/profile
    console.log('OPTIONS /api/profile');
    const optionsResp = await fetch('http://localhost:3000/api/profile', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5500',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type'
      }
    });

    console.log('Status:', optionsResp.status);
    console.log('Headers:', {
      'access-control-allow-origin': optionsResp.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': optionsResp.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': optionsResp.headers.get('access-control-allow-headers'),
      'access-control-allow-credentials': optionsResp.headers.get('access-control-allow-credentials'),
      'set-cookie': optionsResp.headers.get('set-cookie')
    });

    // Test simple GET without credentials first
    console.log('\n\nGET /api/session (sin credenciales)');
    const simpleResp = await fetch('http://localhost:3000/api/session', {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:5500'
      }
    });
    console.log('Status:', simpleResp.status);
    console.log('Access-Control headers:', {
      'access-control-allow-origin': simpleResp.headers.get('access-control-allow-origin'),
      'access-control-allow-credentials': simpleResp.headers.get('access-control-allow-credentials')
    });
    const data = await simpleResp.json();
    console.log('Body:', data);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

testCORSPreflight();
