#!/usr/bin/env node
/**
 * DIAGNÓSTICO DE BD Y ENDPOINTS
 * ================================
 * Este script prueba:
 * 1. Estructura de tabla cuenta_usuario
 * 2. Datos existentes
 * 3. Respuestas de endpoints
 * 4. Errores SQL
 */

const mysql = require('mysql2/promise');

async function diagnostico() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'omar',
        password: '040705',
        database: 'web_programacion',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('\n=== DIAGNÓSTICO DE BD ===\n');

        // 1. Describir tabla cuenta_usuario
        console.log('1. ESTRUCTURA DE TABLA cuenta_usuario:');
        console.log('---');
        const [columns] = await pool.query('DESCRIBE cuenta_usuario');
        columns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NO NULL)' : '(NULL)'} ${col.Key ? `[${col.Key}]` : ''}`);
        });

        // 2. Contar usuarios
        console.log('\n2. USUARIOS EN BD:');
        console.log('---');
        const [countRows] = await pool.query('SELECT COUNT(*) as total FROM cuenta_usuario');
        console.log(`  Total: ${countRows[0].total}`);

        // 3. Ver los últimos 3 usuarios
        console.log('\n3. ÚLTIMOS 3 USUARIOS:');
        console.log('---');
        const [users] = await pool.query('SELECT * FROM cuenta_usuario ORDER BY id_usuarios DESC LIMIT 3');
        users.forEach(u => {
            console.log(`  ID: ${u.id_usuarios}, Usuario: ${u.nombre_usuario}, Email: ${u.correoUsuario}, Rol: ${u.rol}`);
        });

        // 4. Intentar la consulta del endpoint /api/profile
        console.log('\n4. PRUEBA DE CONSULTA /api/profile:');
        console.log('---');
        const userId = users[0]?.id_usuarios;
        if (userId) {
            try {
                const [profileRows] = await pool.query(
                    'SELECT id_usuarios AS id, nombre_usuario, correoUsuario, fecha_de_creacion AS fecha_de_creacion, rol FROM cuenta_usuario WHERE id_usuarios = ?',
                    [userId]
                );
                console.log('  ✓ Consulta EXITOSA');
                console.log('  Resultado:', JSON.stringify(profileRows[0], null, 2));
            } catch (err) {
                console.log('  ✗ Consulta FALLÓ');
                console.log(`  Error: ${err.message}`);
                console.log(`  Code: ${err.code}`);
            }
        }

        // 5. Ver estructura de empleados
        console.log('\n5. ESTRUCTURA DE TABLA empleados:');
        console.log('---');
        try {
            const [empCols] = await pool.query('DESCRIBE empleados');
            empCols.forEach(col => {
                console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NO NULL)' : '(NULL)'} ${col.Key ? `[${col.Key}]` : ''}`);
            });
        } catch (err) {
            console.log(`  Tabla no existe o error: ${err.message}`);
        }

        // 6. Ver estructura de notificaciones
        console.log('\n6. ESTRUCTURA DE TABLA notificaciones:');
        console.log('---');
        try {
            const [notifCols] = await pool.query('DESCRIBE notificaciones');
            notifCols.forEach(col => {
                console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NO NULL)' : '(NULL)'} ${col.Key ? `[${col.Key}]` : ''}`);
            });
        } catch (err) {
            console.log(`  Tabla no existe o error: ${err.message}`);
        }

        // 7. Ver estructura de mensajes
        console.log('\n7. ESTRUCTURA DE TABLA mensajes:');
        console.log('---');
        try {
            const [msgCols] = await pool.query('DESCRIBE mensajes');
            msgCols.forEach(col => {
                console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NO NULL)' : '(NULL)'} ${col.Key ? `[${col.Key}]` : ''}`);
            });
        } catch (err) {
            console.log(`  Tabla no existe o error: ${err.message}`);
        }

        console.log('\n=== FIN DIAGNÓSTICO ===\n');

    } catch (err) {
        console.error('Error en diagnóstico:', err);
    } finally {
        await pool.end();
    }
}

diagnostico();
