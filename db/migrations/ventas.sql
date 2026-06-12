-- Migración: crear/ajustar tablas necesarias para ventas
-- Ejecutar con cuidado en el servidor MySQL (hacer backup primero)

CREATE TABLE IF NOT EXISTS ventashay (
  id_venta INT AUTO_INCREMENT PRIMARY KEY,
  venta_group VARCHAR(128) DEFAULT NULL,
  id_usuario INT NOT NULL,
  id_producto INT DEFAULT NULL,
  id_servicio_servidor INT DEFAULT NULL,
  id_servicio_seguridad INT DEFAULT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fecha_compra DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('pendiente','completada','cancelada') NOT NULL DEFAULT 'completada',
  INDEX (id_usuario),
  INDEX (venta_group),
  FOREIGN KEY (id_usuario) REFERENCES cuenta_usuario(id_usuarios) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
