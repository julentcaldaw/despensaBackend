# Domain Model

## Enums

### Difficulty
Recipe difficulty level.
- `EASY`
- `MEDIUM`
- `HARD`

## Entities

### User
Authenticated account. Central entity of the system.

Fields:
- `id` — autoincrement PK
- `email` — unique
- `username` — unique
- `password` — hashed
- `avatar` — optional URL
- `createdAt`, `updatedAt`

### IngredientCategory
Groups ingredients by type (dairy, vegetables, pantry staples...).

Fields:
- `id` — autoincrement PK
- `name` — unique

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
- `categoryId` → `IngredientCategory`

### IngredientRestriction _(join table)_
Many-to-many between `Ingredient` and `Restriction`.

Composite PK: `[ingredientId, restrictionId]`

### Recipe
Recipe created by a user, with a difficulty level and preparation time.

Fields:
- `id` — autoincrement PK
- `name`
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
- `name`

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

## Relationships
- A `User` has many `Order`, `ShoppingItem`, `Recipe` (as author), `UserSavedRecipe`, `UserFavoriteShop`.
- An `Ingredient` belongs to one `IngredientCategory`.
- An `Ingredient` has many `Restriction` via `IngredientRestriction`.
- A `Recipe` belongs to one `User` (author).
- A `Recipe` has many `Ingredient` via `RecipeIngredient`.
- A `Recipe` can be saved by many `User` via `UserSavedRecipe`.
- A `Shop` can be favorited by many `User` via `UserFavoriteShop`.
- An `Order` belongs to one `User` and one `Shop`.
- An `Order` has many `ShoppingItem`.
- A `ShoppingItem` belongs to one `User` and optionally to one `Order`.

## Invariants
- `email` and `username` must be unique per user.
- `IngredientCategory.name` and `Restriction.name` must be unique.
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

