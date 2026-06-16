/**
 * CREAR USUARIO ADMIN PARA TESTS
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createAdmin() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'omar',
    password: '040705',
    database: 'web_programacion'
  });

  try {
    const adminEmail = 'admin@test.com';
    const adminPassword = 'admin123456';
    const adminName = 'Admin Test';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('CREANDO USUARIO ADMIN');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Nombre:', adminName);

    // Delete existing admin
    await pool.query('DELETE FROM cuenta_usuario WHERE correoUsuario = ?', [adminEmail]);
    console.log('\n✓ Usuario anterior eliminado');

    // Insert admin user
    const [result] = await pool.query(
      'INSERT INTO cuenta_usuario (nombre_usuario, correoUsuario, contrasenia, rol, fecha_decreacion) VALUES (?, ?, ?, ?, ?)',
      [adminName, adminEmail, hashedPassword, 'Administrador', new Date()]
    );
    console.log('✓ Admin creado. ID:', result.insertId);

    // Verify user exists
    const [users] = await pool.query('SELECT id_usuarios, nombre_usuario, correoUsuario, rol FROM cuenta_usuario WHERE correoUsuario = ?', [adminEmail]);
    if (users.length) {
      console.log('✓ Admin verificado:');
      console.log('  - ID:', users[0].id_usuarios);
      console.log('  - Nombre:', users[0].nombre_usuario);
      console.log('  - Email:', users[0].correoUsuario);
      console.log('  - Rol:', users[0].rol);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('ADMIN CREADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
