# Domain Model

## Enums

### Difficulty

Recipe difficulty level.

- `EASY`
- `MEDIUM`
- `HARD`

### UserRole

Authorization role assigned to users.

- `USER`
- `CONTRIBUTOR`
- `ADMIN`

### Conservation

Storage location for pantry items.

- `NEVERA`
- `CONGELADOR`
- `DESPENSA`

### Unit

Canonical unit values allowed for pantry items.

- `G`
- `KG`
- `ML`
- `L`
- `UNIT`
- `PACK`
- `CAN`
- `BOTTLE`
- `JAR`
- `BOX`
- `BAG`
- `TBSP`
- `TSP`
- `SLICE`
- `CLOVE`

## Entities

### User

Authenticated account. Central entity of the system.

Fields:

- `id` — autoincrement PK
- `email` — unique
- `username` — unique
- `password` — hashed
- `role` — enum `UserRole`, default `USER`
- `avatar` — optional URL
- `createdAt`, `updatedAt`

### IngredientCategory

Groups ingredients by type (dairy, vegetables, pantry staples...).

Fields:

- `id` — autoincrement PK
- `name` — unique
- `icon` — string, default `test`

### Restriction

Dietary or allergen tag for ingredients (gluten, lactose, vegan...).

Fields:

- `id` — autoincrement PK
- `name` — unique

### Ingredient

Reusable ingredient definition belonging to a category. Can carry multiple dietary restrictions.

Fields:

- `id` — autoincrement PK
- `name`
- `normalizedName` — optional normalized string for search/indexing
- `tsvName` — optional text-search field for indexing/search
- `categoryId` → `IngredientCategory`

### Barcode

Barcode value assigned to an ingredient. An ingredient can have multiple barcodes.

Fields:

- `id` — autoincrement PK
- `value` — unique barcode string
- `ingredientId` → `Ingredient`

### IngredientRestriction _(join table)_

Many-to-many between `Ingredient` and `Restriction`.

Composite PK: `[ingredientId, restrictionId]`

### Recipe

Recipe created by a user, with a difficulty level and preparation time.

Fields:

- `id` — autoincrement PK
- `name`
- `detail` — optional long text with the step-by-step instructions
- `image` — optional image URL of the recipe
- `authorId` → `User`
- `difficulty` — enum `Difficulty`
- `prepTime` — integer, minutes
- `createdAt`, `updatedAt`

### RecipeIngredient _(join table)_

Many-to-many between `Recipe` and `Ingredient`, with optional quantity and unit.

Composite PK: `[recipeId, ingredientId]`

Additional fields: `quantity?`, `unit?`

### UserSavedRecipe _(join table)_

Represents a user liking/bookmarking a recipe.

Composite PK: `[userId, recipeId]`

Additional fields: `savedAt`

### Shop

A physical or online store where purchases are made.

Fields:

- `id` — autoincrement PK
- `name` — unique

### UserFavoriteShop _(join table)_

Many-to-many between `User` and `Shop` (favorites).

Composite PK: `[userId, shopId]`

### Order

A completed purchase made by a user at a shop.

Fields:

- `id` — autoincrement PK
- `userId` → `User`
- `shopId` → `Shop`
- `date` — date of purchase
- `price` — total amount
- `ticket` — optional URL of the receipt photo
- `createdAt`, `updatedAt`

### ShoppingItem

Represents either a pending shopping list item or a purchased item attached to an order.

Fields:

- `id` — autoincrement PK
- `userId` → `User`
- `orderId` → `Order` (optional — see invariant below)
- `name`
- `quantity` — optional
- `unit` — optional
- `checked` — boolean, default `false`
- `createdAt`, `updatedAt`

### PantryItem

Represents an ingredient unit owned by a user in their pantry stock.

Fields:

- `id` — autoincrement PK
- `userId` → `User`
- `ingredientId` → `Ingredient`
- `acquiredAt` — add/purchase date, default now
- `expiresAt` — optional expiration date
- `quantity` — required
- `unit` — enum `Unit`, required
- `conservation` — enum `Conservation`, default `NEVERA`
- `shopId` → `Shop` (optional)
- `createdAt`, `updatedAt`

## Relationships

- A `User` has many `Order`, `ShoppingItem`, `PantryItem`, `Recipe` (as author), `UserSavedRecipe`, `UserFavoriteShop`.
- An `Ingredient` belongs to one `IngredientCategory`.
- An `Ingredient` can have many `Barcode` values.
- An `Ingredient` has many `Restriction` via `IngredientRestriction`.
- An `Ingredient` can appear in many `PantryItem` records.
- A `Recipe` belongs to one `User` (author).
- A `Recipe` has many `Ingredient` via `RecipeIngredient`.
- A `Recipe` can be saved by many `User` via `UserSavedRecipe`.
- A `Shop` can be favorited by many `User` via `UserFavoriteShop`.
- A `Shop` can be referenced by many `PantryItem` records.
- An `Order` belongs to one `User` and one `Shop`.
- An `Order` has many `ShoppingItem`.
- A `ShoppingItem` belongs to one `User` and optionally to one `Order`.
- A `PantryItem` belongs to one `User`, one `Ingredient`, and optionally one `Shop`.

## Invariants

- `email` and `username` must be unique per user.
- `User.role` must be one of: `USER`, `CONTRIBUTOR`, `ADMIN`.
- `IngredientCategory.name` and `Restriction.name` must be unique.
- `Barcode.value` must be unique.
- `PantryItem.quantity` must be greater than or equal to 0.
- `PantryItem.expiresAt`, when provided, should be greater than or equal to `PantryItem.acquiredAt`.
- `ShoppingItem.orderId = null` → item is in the pending shopping list.
- `ShoppingItem.orderId = set` → item belongs to a completed order.
- If an `Order` is deleted, its `ShoppingItem.orderId` is set to `null` (`onDelete: SetNull`).
- `Recipe.prepTime` must be a positive integer (minutes).
- `quantity`, when provided, must be greater than 0.

## Notes for implementation

- Keep DTOs separated from domain entities.
- Store dates as ISO strings at API boundary.
- Validate all entity inputs before service execution.
- Use Prisma `include` to fetch related data; avoid N+1 queries.
