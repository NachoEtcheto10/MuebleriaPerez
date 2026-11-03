# Pérez Muebles & Colchones — tienda online

Catálogo con carrito que arma el pedido y lo envía por WhatsApp, planes de financiación configurables y panel de administración.

**Tecnología:** React + Vite + TypeScript + Tailwind. Datos, fotos y login del admin en [Supabase](https://supabase.com) (plan gratuito).

## Correr en la compu

```bash
npm install
npm run dev
```

Sin Supabase configurado la tienda funciona en **modo demo**: usa el catálogo del Excel y los cambios del admin se guardan solo en ese navegador (contraseña del admin en demo: `demo`).

## Puesta en producción

### 1. Supabase (base de datos, fotos y usuarios)

1. Crear un proyecto en <https://supabase.com>.
2. **SQL Editor → New query**: pegar y ejecutar `supabase/schema.sql`.
3. **SQL Editor → New query**: pegar y ejecutar `supabase/seed.sql` (carga los 297 productos del Excel).
4. **Authentication → Sign In / Providers**: desactivar *Allow new users to sign up*.
5. **Authentication → Users → Add user**: crear el usuario de la tienda (e-mail + contraseña).
6. Darle permisos de administrador (reemplazar el e-mail):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'admin@perez.com';
   ```
7. **Project Settings → API**: copiar *Project URL* y la clave *anon public*.

Solo los usuarios cargados en la tabla `admins` pueden modificar productos, precios, coeficientes o fotos. El resto del público solo puede ver el catálogo.

### 2. Vercel (publicar la página)

1. Importar este repositorio en <https://vercel.com>.
2. En **Environment Variables** cargar:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = clave anon public
3. Deploy. El archivo `vercel.json` ya resuelve las rutas internas (`/producto/...`, `/admin`, etc.).

### 3. Primera configuración desde el admin

Entrar a `/admin` y completar **Datos de la tienda**: WhatsApp donde llegan los pedidos, dirección, horarios y redes.

## Actualizar el catálogo desde el Excel

```bash
pip install openpyxl
python scripts/import_excel.py ruta/articulos.xlsx
```

Regenera `src/data/seed.json` (modo demo) y `supabase/seed.sql`. Volver a ejecutar `seed.sql` en Supabase actualiza nombres, categorías y precios sin borrar las fotos, descripciones ni el estado (disponible/destacado) cargados desde el admin.

## Cómo se calculan los precios

- **Precio de lista**: el publicado (si el producto tiene oferta, se aplica su % de descuento).
- **Efectivo / transferencia**: lista × (1 − descuento en efectivo). Por defecto 20%.
- **Cuotas**: lista × coeficiente ÷ cantidad de cuotas. Coeficiente 1 = sin interés.

Los coeficientes de cada plan (Visa y Mastercard, Naranja, Crédito personal, Crédito Argentino, o los que se agreguen) se editan en **Admin → Financiación** y todos los precios de la tienda se recalculan al instante.
