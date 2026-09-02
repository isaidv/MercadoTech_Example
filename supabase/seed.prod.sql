-- ============================================================================
-- seed.prod.sql — Seed de PRODUCCIÓN (Fase 7.4, MercadoTech_sesion7.md)
-- ============================================================================
--
-- Se ejecuta UNA sola vez, a mano, en el SQL Editor del dashboard del
-- proyecto Supabase HOSTED (paso 3 de la Fase 7.4) — nunca vía
-- `supabase db reset` ni contra el Supabase local. `supabase/seed.sql`
-- (el de laboratorio) JAMÁS se acerca a producción: trae usuarios con
-- contraseña conocida (`MercadoTech123!`) y 16 productos falsos, datos de
-- prueba que no tienen nada que hacer en un entorno público.
--
-- Decisión 6 (Fase 7.4): este seed es MÍNIMO a propósito.
--   - 8 categorías: la estructura de navegación del catálogo. Sin
--     categorías, ni el menú ni el formulario de publicar producto del
--     vendedor tienen de dónde elegir.
--   - 10 artículos de FAQ: contenido REAL (no lorem ipsum), reutilizado
--     tal cual de `supabase/seed.sql` sección 10 — son las mismas
--     respuestas de envíos/pagos/devoluciones/cuenta que ya se redactaron
--     con cuidado para la Fase 4.8 (RAG), no datos de prueba. Sin la FAQ
--     indexada, `/soporte` no tiene nada que citar (paso 4, aparte, corre
--     `scripts/index-all.ts` contra prod para vectorizarla).
--   - SIN usuarios, SIN productos, SIN pedidos. El catálogo de producción
--     nace VACÍO — es lo esperado, no un error (el smoke test del paso 10
--     lo confirma con el `EmptyState` real de la home, no con datos de
--     relleno). El primer producto real lo carga un vendedor real,
--     registrado a mano durante ese mismo smoke test.
--
-- `on conflict (id) do nothing` en las dos tablas: vuelve este script
-- seguro de correr más de una vez por accidente (el paso 3 dice "una
-- vez", pero un doble clic en "Run" del SQL Editor no debe romper nada
-- con un error de clave duplicada).
-- ============================================================================


-- ============================================================================
-- 1. CATEGORÍAS (8) — mismos id/name/slug que supabase/seed.sql sección 2,
--    mismo motivo: es la taxonomía real del catálogo, no datos de prueba.
-- ============================================================================

insert into public.categories (id, name, slug) values
  ('d0000000-0000-0000-0000-000000000001', 'Laptops', 'laptops'),
  ('d0000000-0000-0000-0000-000000000002', 'Smartphones', 'smartphones'),
  ('d0000000-0000-0000-0000-000000000003', 'Componentes de PC', 'componentes-de-pc'),
  ('d0000000-0000-0000-0000-000000000004', 'Audio', 'audio'),
  ('d0000000-0000-0000-0000-000000000005', 'Gaming', 'gaming'),
  ('d0000000-0000-0000-0000-000000000006', 'Monitores', 'monitores'),
  ('d0000000-0000-0000-0000-000000000007', 'Accesorios', 'accesorios'),
  ('d0000000-0000-0000-0000-000000000008', 'Redes', 'redes')
on conflict (id) do nothing;


-- ============================================================================
-- 2. SUPPORT_ARTICLES — los mismos 10 artículos de FAQ reales de
--    supabase/seed.sql sección 10, contenido idéntico (título + cuerpo
--    completo), sin las fechas artificiales `now() - interval` del
--    laboratorio — acá `created_at`/`updated_at` toman su default real
--    (`now()`, el momento real de la siembra de producción).
-- ============================================================================

insert into public.support_articles (id, title, content, category, is_published) values

('90000000-0000-0000-0000-000000000001', '¿Cuánto demora el envío de mi pedido?',
'El tiempo de entrega depende de tu ubicación. Para Lima Metropolitana y Callao, el pedido llega en un plazo de 2 a 4 días hábiles desde que el vendedor confirma el pago. Para provincias, el rango habitual es de 4 a 8 días hábiles, dependiendo de la zona y del servicio de courier que use cada vendedor (Olva Courier, Shalom o Serpost, según disponibilidad).

Ten en cuenta que estos plazos empiezan a correr una vez que tu pedido pasa de "pendiente" a "pagado" — mientras el vendedor no confirme la recepción del pago, el pedido no entra a preparación de envío.

Si tu pedido lleva más tiempo del indicado sin actualizarse, te recomendamos primero revisar el estado en "Mis pedidos" y, si sigue sin novedades, escribirle directamente al vendedor desde la sección de preguntas del producto, o abrir un ticket de soporte para que lo revisemos por ti.',
'envíos', true),

('90000000-0000-0000-0000-000000000002', '¿Qué hago si mi pedido llega dañado o incompleto?',
'Si tu pedido llega con el empaque visiblemente dañado, te recomendamos no recibirlo y reportarlo de inmediato al courier. Si ya lo recibiste y notas que el producto está dañado o falta algún accesorio, tienes hasta 48 horas desde la entrega para reportarlo a través de un ticket de soporte, adjuntando fotos claras del producto y del empaque.

Con esa información, nuestro equipo se contacta con el vendedor para coordinar una solución: reposición del producto, envío de la pieza faltante, o reembolso, según corresponda al caso. No es necesario que devuelvas el producto dañado hasta que el vendedor o soporte te lo indiquen explícitamente.

Guardar el empaque original y las fotos del estado en que llegó el paquete acelera bastante el proceso, así que te sugerimos tomarlas apenas abras la caja, antes de manipular el producto.',
'envíos', true),

('90000000-0000-0000-0000-000000000003', '¿Puedo hacer seguimiento de mi pedido en tiempo real?',
'Sí. Desde la sección "Mis pedidos" puedes ver el estado actual de cada compra: pendiente, pagado, enviado, entregado o cancelado. Este estado lo va actualizando el vendedor a medida que avanza la preparación y el envío de tu pedido.

Por ahora no integramos el rastreo en vivo del courier (número de guía con mapa) dentro de la plataforma — cuando el vendedor marca tu pedido como "enviado", generalmente te compartirá el número de seguimiento de Olva, Shalom o el courier que haya usado, para que lo consultes directamente en su página.

Estamos evaluando integrar el rastreo automático en una futura actualización.',
'envíos', true),

('90000000-0000-0000-0000-000000000004', '¿Qué métodos de pago acepta MercadoTech?',
'En esta etapa del proyecto, MercadoTech simula el proceso de pago dentro de la plataforma: al confirmar tu compra, el pedido queda en estado "pendiente" y el vendedor lo marca como "pagado" una vez que verifica la recepción del pago por el medio acordado (transferencia bancaria, Yape, Plin, o tarjeta mediante un enlace de pago externo que te comparte el propio vendedor).

No se procesan pagos con tarjeta directamente dentro del sitio — no te pediremos el número completo de tu tarjeta en ningún formulario de MercadoTech. Cualquier cobro con tarjeta pasa por una pasarela externa (como Culqi o Niubiz) gestionada por el vendedor, nunca por nosotros directamente.

Si un vendedor te pide datos de tu tarjeta por chat o fuera de un enlace de pago oficial, repórtalo de inmediato con soporte — no es una práctica que permitamos en la plataforma.',
'pagos', true),

('90000000-0000-0000-0000-000000000005', '¿Es seguro pagar con tarjeta en MercadoTech?',
'Sí, siempre que el pago se realice a través del enlace de una pasarela de pago reconocida (Culqi, Niubiz, Mercado Pago, etc.) que el propio vendedor te comparta para completar la compra. Estas pasarelas están certificadas bajo el estándar PCI-DSS, el mismo que usan bancos y tiendas grandes, y MercadoTech nunca almacena ni tiene acceso a tu número de tarjeta completo.

Como regla general: desconfía de cualquier pedido de pago que te pida enviar el número de tarjeta, la fecha de vencimiento y el CVV directamente por chat, WhatsApp o correo. Ninguna transacción legítima en MercadoTech funciona así.

Si tienes dudas sobre si un enlace de pago es legítimo, puedes preguntarle a nuestro equipo de soporte antes de completar el pago.',
'pagos', true),

('90000000-0000-0000-0000-000000000006', '¿Puedo pagar contra entrega?',
'El pago contra entrega no es un método soportado directamente por la plataforma — el flujo estándar de MercadoTech es confirmar el pago con el vendedor antes de que el pedido se marque como "pagado" y se prepare el envío.

Dicho esto, algunos vendedores ofrecen esta modalidad de forma particular para pedidos dentro de Lima, coordinándola directamente contigo por chat después de hacer el pedido. Si te interesa esta opción, te recomendamos preguntarle al vendedor desde la sección de preguntas del producto antes de comprar, para confirmar si la tiene disponible en tu zona.

Ten presente que, en ese caso, la coordinación de la entrega queda a cargo del vendedor y no de MercadoTech.',
'pagos', true),

('90000000-0000-0000-0000-000000000007', '¿Cuál es la política de devoluciones y cambios?',
'Tienes hasta 7 días calendario desde que recibes tu pedido para solicitar una devolución o un cambio, siempre que el producto esté en las mismas condiciones en que lo recibiste: sin uso, con su empaque original y todos sus accesorios.

Para solicitar una devolución, abre un ticket de soporte indicando el número de pedido y el motivo. Nuestro equipo coordina con el vendedor la logística de retorno del producto. Una vez que el vendedor confirma que recibió el producto en buen estado, se procesa el reembolso o el cambio, según lo que hayas solicitado.

Los productos personalizados, o los que el vendedor haya marcado explícitamente como "sin devolución" en su descripción, quedan excluidos de esta política — revisa siempre la descripción completa del producto antes de comprar si tienes dudas.

El costo del envío de devolución lo asume el comprador, salvo que el motivo sea un error del vendedor (producto equivocado, dañado de fábrica, etc.), en cuyo caso lo cubre el vendedor.',
'devoluciones', true),

('90000000-0000-0000-0000-000000000008', 'Mi producto llegó con una falla, ¿tiene garantía?',
'Todos los productos nuevos vendidos en MercadoTech mantienen la garantía del fabricante, que en la mayoría de los casos es de 12 meses para electrónica de consumo (laptops, smartphones, monitores, componentes de PC). El plazo exacto depende de la marca y el modelo — revisa la ficha del producto o la caja para confirmarlo.

Si detectas una falla dentro de los primeros 7 días, puedes tramitarlo como una devolución por producto defectuoso (ver el artículo de política de devoluciones). Pasado ese plazo, pero dentro del período de garantía, deberás coordinar directamente con el vendedor o con el centro de servicio autorizado de la marca en Perú, según corresponda.

Los productos marcados como "usado" o "reacondicionado" pueden tener una garantía distinta (normalmente de 30 a 90 días otorgada por el propio vendedor) — siempre está indicada en la descripción del producto.',
'devoluciones', true),

('90000000-0000-0000-0000-000000000009', '¿Cómo actualizo los datos de mi cuenta?',
'Puedes actualizar tu nombre visible, teléfono y foto de perfil desde la sección de tu cuenta. Los cambios se guardan de inmediato y se reflejan en tus próximas preguntas, reseñas y pedidos.

Por motivos de seguridad, el correo electrónico asociado a tu cuenta y tu rol (comprador, vendedor o administrador) no se pueden cambiar desde tu propio perfil. Si necesitas actualizar tu correo, o si eres comprador y quieres empezar a vender en la plataforma, debes solicitarlo a través de un ticket de soporte para que el equipo lo valide y lo actualice.

Tu contraseña se puede restablecer en cualquier momento desde la pantalla de inicio de sesión, con el enlace "¿Olvidaste tu contraseña?".',
'cuenta', true),

('90000000-0000-0000-0000-000000000010', '¿Cómo me convierto en vendedor dentro de MercadoTech?',
'Para empezar a vender, primero crea una cuenta normal de comprador y luego solicita la conversión a vendedor mediante un ticket de soporte, indicando el nombre con el que quieres publicar tus productos (puede ser tu nombre o el de tu tienda/negocio).

Nuestro equipo revisa la solicitud y, una vez aprobada, tu cuenta pasa a tener el rol de vendedor: vas a poder publicar productos, subir fotos, responder preguntas de compradores y gestionar el estado de los pedidos que te lleguen.

Como vendedor, sos responsable de mantener actualizado el stock de tus publicaciones, responder las preguntas de los compradores en un plazo razonable, y cumplir con los tiempos de envío indicados. El incumplimiento reiterado de estas responsabilidades puede llevar a una suspensión de la cuenta, evaluada caso por caso por el equipo de MercadoTech.',
'cuenta', true)

on conflict (id) do nothing;


-- ============================================================================
-- Verificación rápida (correr después, en el mismo SQL Editor, o en
-- Table Editor):
--   select count(*) from public.categories;        -- esperado: 8
--   select count(*) from public.support_articles;   -- esperado: 10
--   select count(*) from public.products;            -- esperado: 0
--   select count(*) from public.profiles;              -- esperado: 0
-- ============================================================================
