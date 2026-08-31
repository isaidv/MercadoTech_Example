-- Extiende el archivo de extensiones de la Fase 2.1
-- (20260821100000_enable_extensions.sql) — esa migración ya aplicada no se
-- toca; esta es nueva.
--
-- Fase 4.1: pgvector agrega el tipo `vector` y los operadores de distancia
-- (<->, <=>, <#>) que usa `knowledge_embeddings` y su índice HNSW. Igual
-- que pgcrypto, se instala en el esquema "extensions" (convención de
-- Supabase) y no en "public", para mantener el catálogo de public limpio
-- de objetos de extensión.
create extension if not exists vector with schema extensions;
