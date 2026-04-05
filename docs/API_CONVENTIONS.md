# API Conventions

## Response envelope

### Success
```json
{
  "ok": true,
  "data": {}
}
```

### Error
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {}
  }
}
```

## HTTP status guidelines
- `200 OK`: successful read/update.
- `201 Created`: successful resource creation.
- `204 No Content`: successful deletion without body.
- `400 Bad Request`: invalid input format.
- `401 Unauthorized`: missing/invalid auth.
- `403 Forbidden`: authenticated but not allowed.
- `404 Not Found`: resource does not exist.
- `409 Conflict`: state conflict (duplicates, invalid transitions).
- `422 Unprocessable Entity`: semantically invalid data.
- `500 Internal Server Error`: unexpected server failure.

## Validation rules
- Validate `params`, `query`, and `body` before calling services.
- Return stable `error.code` values for predictable client behavior.
- Avoid leaking stack traces in production responses.

## Route design
- Use plural resources: `/users`, `/pantries`, `/products`.
- Keep nested routes shallow and meaningful.
- Prefer explicit route params (`/pantries/:pantryId/items/:itemId`).

## Logging and traceability
- Log request id, method, path, status code, and execution time.
- Do not log sensitive fields (passwords, tokens, secrets).
