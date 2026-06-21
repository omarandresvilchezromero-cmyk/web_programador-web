-- Migración: crear/ajustar tablas necesarias para ventas
-- Ejecutar con cuidado en el servidor MySQL (hacer backup primero)

CREATE TABLE IF NOT EXISTS ventashay (
  id_venta INT AUTO_INCREMENT PRIMARY KEY,
  venta_group VARCHAR(128) DEFAULT NULL,
  id_usuario INT NOT NULL,
  id_producto INT DEFAULT NULL,
  id_servicio_servidor INT DEFAULT NULL,
  id_servicio_seguridad INT DEFAULT NULL,
  id_empleado_responsable INT DEFAULT NULL,
  servicio_estado VARCHAR(50) DEFAULT NULL,
  fecha_asignacion DATETIME DEFAULT NULL,
  fecha_actualizacion DATETIME DEFAULT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fecha_compra DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('pendiente','completada','cancelada') NOT NULL DEFAULT 'completada',
  INDEX (id_usuario),
  INDEX (venta_group),
  INDEX (id_empleado_responsable),
  FOREIGN KEY (id_usuario) REFERENCES cuenta_usuario(id_usuarios) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE ventashay
  ADD COLUMN IF NOT EXISTS id_empleado_responsable INT DEFAULT NULL AFTER id_servicio_seguridad,
  ADD COLUMN IF NOT EXISTS servicio_estado VARCHAR(50) DEFAULT NULL AFTER id_empleado_responsable,
  ADD COLUMN IF NOT EXISTS fecha_asignacion DATETIME DEFAULT NULL AFTER servicio_estado,
  ADD COLUMN IF NOT EXISTS fecha_actualizacion DATETIME DEFAULT NULL AFTER fecha_asignacion,
  ADD INDEX IF NOT EXISTS idx_ventashay_empleado (id_empleado_responsable);

CREATE TABLE IF NOT EXISTS ventas (
  id_venta INT AUTO_INCREMENT PRIMARY KEY,
  venta_group VARCHAR(128) DEFAULT NULL,
  id_usuario INT NOT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fecha_compra DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('pendiente','completada','cancelada') NOT NULL DEFAULT 'completada',
  INDEX (id_usuario),
  INDEX (venta_group),
  FOREIGN KEY (id_usuario) REFERENCES cuenta_usuario(id_usuarios) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Asegurar que products_vendidos tenga id_producto
ALTER TABLE products_vendidos
  ADD COLUMN IF NOT EXISTS id_producto INT AUTO_INCREMENT PRIMARY KEY;

CREATE TABLE IF NOT EXISTS servicios_servidores (
  id_servicio INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS servicios_seguridad (
  id_servicio INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS historial_compras (
  id_historial INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_venta INT DEFAULT NULL,
  tipo_compra ENUM('producto','servidor','seguridad') NOT NULL,
  referencia_id INT DEFAULT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  descripcion TEXT,
  INDEX (id_usuario),
  INDEX (id_venta),
  FOREIGN KEY (id_usuario) REFERENCES cuenta_usuario(id_usuarios) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS valoraciones (
  id_valoracion INT AUTO_INCREMENT PRIMARY KEY,
  id_empleado INT NOT NULL,
  id_usuario INT NOT NULL,
  id_venta INT DEFAULT NULL,
  puntuacion TINYINT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario TEXT,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (id_empleado),
  INDEX (id_usuario),
  FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON DELETE CASCADE,
  FOREIGN KEY (id_usuario) REFERENCES cuenta_usuario(id_usuarios) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reportes_empleados (
  id_reporte INT AUTO_INCREMENT PRIMARY KEY,
  id_empleado INT NOT NULL,
  id_usuario INT NOT NULL,
  id_venta INT DEFAULT NULL,
  motivo VARCHAR(250),
  detalle TEXT,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notificado_admin TINYINT(1) NOT NULL DEFAULT 0,
  INDEX (id_empleado),
  INDEX (id_usuario),
  FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON DELETE CASCADE,
  FOREIGN KEY (id_usuario) REFERENCES cuenta_usuario(id_usuarios) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS historial_admin (
  id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
  evento VARCHAR(150) NOT NULL,
  id_usuario INT DEFAULT NULL,
  id_empleado INT DEFAULT NULL,
  id_venta INT DEFAULT NULL,
  detalle TEXT,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (id_usuario),
  INDEX (id_empleado),
  INDEX (id_venta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Opcional: tabla de items por venta (si se desea normalizar más adelante)
CREATE TABLE IF NOT EXISTS venta_items (
  id_item INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  tipo ENUM('producto','servidor','seguridad') NOT NULL,
  referencia_id INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (id_venta) REFERENCES ventashay(id_venta) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
