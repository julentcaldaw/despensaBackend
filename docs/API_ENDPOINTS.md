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

- [GET] recipes -> Lista paginada de recetas (excluyendo cookable y almost-cookable) con autor, número de ingredientes e indicadores `inStock` e `inShoppingList` por cada ingrediente. Soporta `page` (default 1) y `pageSize` (default 30, máximo 100). Ordena por mayor porcentaje de ingredientes disponibles en despensa, después por número absoluto de ingredientes disponibles, más recientes y luego `like=true`. Respuesta incluye información de paginación: `{ items: [], total, page, pageSize, totalPages }`. Requiere auth.
- [GET] recipes/overview -> **Endpoint unificado optimizado:** devuelve en una sola petición: `cookable` (100% ingredientes), `almostCookable` (>75% ingredientes, max 4 faltantes), y `recipes` paginada (excluye las dos categorías anteriores). Los ingredientes de todas las listas incluyen `inStock` e `inShoppingList`. Soporta `page` y `pageSize` para recetas normales. Requiere auth.
- [GET] recipes/search -> Búsqueda predictiva de recetas por nombre (`query`) con límite opcional (`limit`). Cada resultado incluye `like` (favorita), `ingredientsCount` (total), `pantryIngredientsCount` (en despensa) y `shoppingListIngredientsCount` (en lista de compra) según el usuario autenticado. Requiere auth.
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
