const pool = require('./htmls/javascript/conexion mysql.js');

async function promoteAdmins() {
  try {
    console.log('Promoviendo usuarios a Administrador...\n');
    
    // Promover específicamente los IDs que creamos en el test
    const adminIds = [25]; // ID del último admin creado en el test
    
    for (const id of adminIds) {
      await pool.query('UPDATE cuenta_usuario SET rol = ? WHERE id_usuarios = ?', ['Administrador', id]);
      console.log(`✓ Usuario ${id} → Administrador`);
    }
    
    // Listar todos los usuarios con rol
    const [users] = await pool.query('SELECT id_usuarios, nombre_usuario, correoUsuario, rol FROM cuenta_usuario ORDER BY id_usuarios DESC LIMIT 5');
    console.log('\nÚltimos 5 usuarios:');
    users.forEach(u => {
      console.log(`  ID ${u.id_usuarios}: ${u.nombre_usuario} (${u.correoUsuario}) = ${u.rol}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

promoteAdmins();
