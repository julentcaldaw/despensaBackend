# API Endpoints

## AUTH

- [POST] auth/register
- [POST] auth/login
- [POST] auth/refresh

## INGREDIENTS

- [GET] ingredients/search -> Búsqueda predictiva de ingredientes por texto (`query`) con límite opcional (`limit`). Requiere auth.
- [POST] ingredients/search/similarity -> Primero intenta match exacto por `barcode`; si no existe, busca por similitud usando FTS + trigram sobre `name`. Requiere auth.
- [POST] ingredients -> Crea un ingrediente. Requiere auth + rol `CONTRIBUTOR` o `ADMIN`.
- [POST] ingredients/bulk -> Crea varios ingredientes en lote. Requiere auth + rol `CONTRIBUTOR` o `ADMIN`.

## RECIPES

- [GET] recipes -> Lista recetas con autor, número de ingredientes y `like` boolean según el usuario autenticado. Requiere auth.
- [GET] recipes/cookable -> Devuelve dos listados: `cookable` (100% ingredientes disponibles) y `almostCookable` (más del 75% disponibles y como máximo 4 ingredientes faltantes). Requiere auth.
- [GET] recipes/:id -> Obtiene detalle de receta con ingredientes. Requiere auth.
- [POST] recipes/:id/like -> Marca o desmarca like para una receta del usuario autenticado (body obligatorio `{ like: boolean }`). El usuario se obtiene del token, no del body. Requiere auth.
- [POST] recipes -> Crea una receta del usuario autenticado. Soporta `detail` para el paso a paso e `image` opcional. Requiere auth.
- [PATCH] recipes/:id -> Actualiza una receta propia del usuario autenticado. Soporta `detail` para el paso a paso e `image` opcional. Requiere auth.
- [DELETE] recipes/:id -> Elimina una receta propia del usuario autenticado. Requiere auth.

## PANTRY

- [GET] pantries -> Obtiene los ingredientes de la despensa del usuario autenticado.
- [POST] pantries -> Añade un ingrediente a la despensa del usuario autenticado.
- [DELETE] pantries -> Elimina un ingrediente de la despensa del usuario autenticado.

## PANTRY ITEMS

- [GET] pantry-items -> Lista los items de despensa del usuario autenticado.
- [POST] pantry-items -> Crea un item de despensa para el usuario autenticado.
- [PATCH] pantry-items/:id -> Actualiza un item de despensa del usuario autenticado.
- [DELETE] pantry-items/:id -> Elimina un item de despensa del usuario autenticado.

## SHOPS

- [GET] shops -> Lista las tiendas disponibles (ordenadas por likes desc y nombre asc) e incluye `like` boolean según el usuario autenticado. Requiere auth.
- [POST] shops/:id/like -> Marca o desmarca like para una tienda del usuario autenticado (body opcional `{ like: boolean }`, por defecto `true`). El usuario se obtiene del token, no del body. Requiere auth.

## SHOPPING ITEMS

- [GET] shopping-items -> Lista los items de compra del usuario autenticado. Soporta `state=pending|ordered|all` (default `pending`). Requiere auth.
- [POST] shopping-items -> Crea un item de compra para el usuario autenticado. Requiere auth.
- [PATCH] shopping-items/:id -> Actualiza un item de compra del usuario autenticado. Requiere auth.
- [DELETE] shopping-items/:id -> Elimina un item de compra del usuario autenticado. Requiere auth.
