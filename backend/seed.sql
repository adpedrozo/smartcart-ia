-- ============================================================
-- SmartCart IA — Datos de demo
-- Ejecutar en el SQL Editor de Supabase para cargar datos demo
-- ============================================================

-- Limpiar tablas existentes (opcional)
-- DELETE FROM prices;
-- DELETE FROM products;

-- ===== PRODUCTOS =====
INSERT INTO products (id, name, category, unit, current_stock, minimum_stock, created_at) VALUES
(2,  'Azúcar Ledesma 1 Kg',                        'Almacén',         'unidades', 0, 1, NOW()),
(6,  'Papas Fritas Lays 200 Grs',                  'Almacén',         'unidades', 2, 1, NOW()),
(9,  'Cerveza Dunkel Mecklenburger X 500 Cc',      'Bebidas',         'unidades', 1, 1, NOW()),
(10, 'Gaseosa Regular Coca Cola Lata X 350 Ml',    'Bebidas',         'unidades', 1, 1, NOW()),
(11, 'Pan Artesanal Bimbo X 500 Grs',              'Panadería',       'unidades', 2, 1, NOW()),
(12, 'Mermelada De Rosa Mosqueta El Brocal X 420 Grs', 'Almacén',    'unidades', 2, 1, NOW()),
(13, 'Queso Azul San Ignacio',                     'Lácteos',         'unidades', 1, 1, NOW()),
(14, 'Shampoo Sedal 350Ml',                        'Higiene Personal','unidades', 1, 1, NOW());

-- Actualizar secuencia para que los próximos IDs no colisionen
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));

-- ===== PRECIOS =====
INSERT INTO prices (product_id, supermarket, price, recorded_at) VALUES
-- Azúcar Ledesma 1 Kg
(2,  'Coto',      1500, '2026-08-11 23:19:02+00'),
(2,  'Makro',      900, '2026-08-15 19:42:11+00'),

-- Papas Fritas Lays 200 Grs
(6,  'Coto',      1800, '2026-08-12 03:02:05+00'),
(6,  'Carrefour', 2100, '2026-08-12 20:01:41+00'),
(6,  'Dia',       1900, '2026-08-15 00:00:00+00'),
(6,  'Makro',     2000, '2026-08-16 15:46:45+00'),

-- Cerveza Dunkel Mecklenburger X 500 Cc
(9,  'Otro',      1190, '2026-08-14 20:47:42+00'),

-- Gaseosa Regular Coca Cola Lata X 350 Ml
(10, 'Otro',      1500, '2026-08-14 20:47:43+00'),

-- Pan Artesanal Bimbo X 500 Grs
(11, 'Carrefour', 2199, '2026-08-15 21:18:08+00'),
(11, 'Carrefour', 2400, '2026-08-15 21:28:32+00'),

-- Mermelada De Rosa Mosqueta El Brocal X 420 Grs
(12, 'Carrefour', 2199, '2026-08-15 21:18:07+00'),
(12, 'Carrefour', 1580, '2026-08-15 21:28:33+00'),

-- Queso Azul San Ignacio
(13, 'Otro',      1290, '2026-08-15 21:45:31+00'),

-- Shampoo Sedal 350Ml
(14, 'Otro',      3380, '2026-08-15 21:45:32+00');
