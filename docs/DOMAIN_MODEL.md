# Domain Model

## Entities

### User
Represents an authenticated account that owns one or more pantries.

Suggested fields:
- id
- email
- passwordHash
- name
- createdAt
- updatedAt

### Pantry
Logical container of items for a user (or household in future versions).

Suggested fields:
- id
- userId
- name
- createdAt
- updatedAt

### Product
Reusable product definition (for example: milk, rice, eggs).

Suggested fields:
- id
- name
- categoryId
- defaultUnit
- createdAt
- updatedAt

### Category
Groups products (for example: dairy, vegetables, pantry staples).

Suggested fields:
- id
- name
- createdAt
- updatedAt

### PantryItem
Concrete stock item inside a pantry.

Suggested fields:
- id
- pantryId
- productId
- quantity
- unit
- expirationDate (nullable)
- createdAt
- updatedAt

### ShoppingList
A list used to plan purchases for a pantry.

Suggested fields:
- id
- pantryId
- name
- status (`open` | `completed`)
- createdAt
- updatedAt

### ShoppingListItem
Line item of a shopping list.

Suggested fields:
- id
- shoppingListId
- productId
- quantity
- unit
- checked
- createdAt
- updatedAt

## Relationships
- A User has many Pantries.
- A Pantry has many PantryItems.
- A Product belongs to one Category.
- A PantryItem references one Product.
- A Pantry has many ShoppingLists.
- A ShoppingList has many ShoppingListItems.
- A ShoppingListItem references one Product.

## Invariants
- `quantity` must be greater than 0.
- `unit` must be present when quantity is provided.
- `expirationDate`, when present, must be a valid future or past date in ISO format.
- `email` must be unique per user.
- `category.name` should be unique in catalog context.
- `shoppingList.status = completed` implies no further item mutations unless reopened.

## Notes for implementation
- Keep DTOs separated from domain entities.
- Store dates as ISO strings at API boundary.
- Validate all entity inputs before service execution.
