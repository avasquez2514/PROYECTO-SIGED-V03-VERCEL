# 💻 SIGED - Sistema Integrado de Gestión de Despacho

[![Frontend](https://img.shields.io/badge/Frontend-Next.js-000000)](https://nextjs.org/)
[![Base de Datos](https://img.shields.io/badge/Base%20de%20Datos-Supabase-3ecf8e)](https://supabase.com/)
[![Despliegue](https://img.shields.io/badge/Despliegue-Vercel-000000)](https://vercel.com/)

Sistema web para el área de **Despacho B2B de Energía Integral Andina** (contratista de TIGO): registro de notas y plantillas, aplicativos de trabajo, notas rápidas y de avances.

## 🏗️ Arquitectura

Aplicación **Next.js (App Router)** única: el frontend y la API viven en el mismo proyecto.

| Capa | Tecnología |
| :--- | :--- |
| Frontend | Next.js 15 + React 19 |
| API | Route Handlers en `src/app/api/**` (serverless, compatible con Vercel) |
| Auth | JWT (8 h) + contraseñas con bcrypt |
| Base de datos | PostgreSQL en Supabase (pooler, puerto 6543) |

Utilidades compartidas en `src/lib/` (`db.ts`, `auth.ts`, `defaults.ts`).

## ⚙️ Instalación local

```bash
npm install
cp .env.example .env     # y completa los valores
npm run dev              # desarrollo  → http://localhost:3000
npm run build && npm run start   # producción local
```

Variables de entorno: ver [.env.example](./.env.example).

## ☁️ Despliegue en Vercel

1. Sube el proyecto a GitHub (el `.env` está en `.gitignore`).
2. En Vercel: **Add New → Project** e importa el repositorio (detecta Next.js solo).
3. En **Settings → Environment Variables** agrega: `DATABASE_URL`, `KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. [vercel.json](./vercel.json) fija la región `iad1` (cerca de Supabase us-east-2) y un cron diario a `/api/health` que evita que Supabase gratis se pause por inactividad.

## 🔐 Notas de seguridad

- Nunca subas `.env` ni compartas `DATABASE_URL` o `KEY`.
- Activa RLS en las tablas/buckets de Supabase que use el cliente (`NEXT_PUBLIC_SUPABASE_*`).
- Las contraseñas antiguas en texto plano se convierten a bcrypt automáticamente en el siguiente inicio de sesión.

## 👥 Desarrolladores

| Rol | Nombre |
| :--- | :--- |
| Estudiante | Anderson Vasquez Gonzalez |
| Asesor(es) | Diana Maria Rico Mesa |
| Institución | Instituto Tecnológico Metropolitano (ITM) |
| Fecha de Entrega | 06/10/2025 |
