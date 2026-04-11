# Swagger/OpenAPI Documentation Guide

Este documento describe cómo documentar endpoints en Swagger usando JSDoc.
Copilot debe seguir este patrón para todos los nuevos endpoints.

## Estructura general

Cada endpoint debe tener un bloque JSDoc `@openapi` inmediatamente antes de su definición.
El bloque debe incluir:

- `summary`: descripción corta (máx 120 caracteres)
- `description`: detalles adicionales
- `tags`: categoría lógica
- `parameters` (opcional): path, query, headers
- `requestBody` (opcional): payload del request
- `responses`: al menos 200, 400, 401 y 403 si aplica

## Plantillas por método

### GET (listar o detalle)

```typescript
/**
 * @openapi
 * /products:
 *   get:
 *     summary: Listar productos
 *     description: Obtiene lista de productos con filtros opcionales
 *     tags:
 *       - Products
 *     parameters:
 *       - name: categoryId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filtrar por categoría (opcional)
 *     responses:
 *       200:
 *         description: Lista de productos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get("/products", (req, res) => {
  // implementación
});
```

### GET por ID

```typescript
/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Obtener producto por ID
 *     tags:
 *       - Products
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get("/products/:id", (req, res) => {
  // implementación
});
```

### POST (crear)

```typescript
/**
 * @openapi
 * /products:
 *   post:
 *     summary: Crear producto
 *     tags:
 *       - Products
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Leche fresca"
 *               categoryId:
 *                 type: string
 *                 example: "cat-001"
 *               defaultUnit:
 *                 type: string
 *                 enum: [ml, L, g, kg, units]
 *                 example: "L"
 *             required: [name, categoryId, defaultUnit]
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validación fallida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *     security:
 *       - bearerAuth: []
 */
app.post("/products", (req, res) => {
  // implementación
});
```

### PUT (actualizar)

```typescript
/**
 * @openapi
 * /products/{id}:
 *   put:
 *     summary: Actualizar producto
 *     tags:
 *       - Products
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               defaultUnit:
 *                 type: string
 *     responses:
 *       200:
 *         description: Producto actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *     security:
 *       - bearerAuth: []
 */
app.put("/products/:id", (req, res) => {
  // implementación
});
```

### DELETE

```typescript
/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Eliminar producto
 *     tags:
 *       - Products
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Producto eliminado exitosamente
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *     security:
 *       - bearerAuth: []
 */
app.delete("/products/:id", (req, res) => {
  // implementación
});
```

## Cómo añadir esquemas reutilizables

Los esquemas base están en `src/docs/swagger.ts` en `components.schemas`.
Para nuevas entidades, añade sus esquemas aquí:

```typescript
// En src/docs/swagger.ts, dentro de components.schemas:
schemas: {
  Product: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      categoryId: { type: "string" },
      defaultUnit: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "categoryId", "defaultUnit"],
  },
  // más esquemas...
}
```

Luego usa en endpoints: `$ref: '#/components/schemas/Product'`

## Reglas clave

1. **Documentación antes de código**: escribe JSDoc primero, luego implementa.
2. **Siempre include error responses**: 400, 401, 403, 404, 422 según corresponda.
3. **Sé específico en ejemplos**: usa datos realistas (ej: "Leche fresca" no "product").
4. **Tags coherentes**: agrupa por recurso (Products, Users, Pantries, etc).
5. **Esquemas reutilizables**: no repitas definiciones, usa `$ref`.
6. **Secureity en endpoints protegidos**: añade `security: [{ bearerAuth: [] }]`.
7. **RBAC explícito**: cuando una ruta requiera roles concretos, menciónalo en `description` y documenta `403 Forbidden`.

## Validación

Después de añadir documentación:

1. `npm run build` debe pasar sin errores
2. Abre http://localhost:3000/docs para verificar visualización
3. Verifica que los ejemplos de respuesta sean coherentes con el código
