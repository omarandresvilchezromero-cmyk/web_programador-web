const pool = require('./htmls/javascript/conexion mysql.js');

async function checkTables() {
  try {
    console.log('=== CHEQUEANDO ESTRUCTURA DE TABLAS ===\n');
    
    const tables = ['cuenta_usuario', 'solicitudes_empleo', 'empleados', 'notificaciones', 'mensajes'];
    
    for (const table of tables) {
      console.log(`\n--- TABLA: ${table} ---`);
      const [columns] = await pool.query(`DESCRIBE ${table}`);
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'}) ${col.Key ? '[' + col.Key + ']' : ''}`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

checkTables();
