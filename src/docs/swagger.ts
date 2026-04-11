import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.3",
        info: {
            title: "Despensa API",
            version: "1.0.0",
            description: "API para gestión de despensa: inventario, caducidades y listas de compra",
            contact: {
                name: "Despensa Team",
                email: "support@despensa.local",
            },
        },
        servers: [
            {
                url: "http://localhost:3000",
                description: "Development",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                UserRole: {
                    type: "string",
                    enum: ["USER", "CONTRIBUTOR", "ADMIN"],
                    example: "USER",
                },
                Conservation: {
                    type: "string",
                    enum: ["NEVERA", "CONGELADOR", "DESPENSA"],
                    example: "NEVERA",
                },
                Unit: {
                    type: "string",
                    enum: ["G", "KG", "ML", "L", "UNIT", "PACK", "CAN", "BOTTLE", "JAR", "BOX", "BAG", "TBSP", "TSP", "SLICE", "CLOVE"],
                    example: "UNIT",
                },
                AuthUser: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            example: 1,
                        },
                        email: {
                            type: "string",
                            format: "email",
                            example: "usuario@despensa.local",
                        },
                        username: {
                            type: "string",
                            example: "alvaro",
                        },
                        role: {
                            $ref: "#/components/schemas/UserRole",
                        },
                        avatar: {
                            type: "string",
                            nullable: true,
                            example: "https://cdn.example.com/avatar.png",
                        },
                    },
                    required: ["id", "email", "username", "role", "avatar"],
                },
                AuthResult: {
                    type: "object",
                    properties: {
                        user: {
                            $ref: "#/components/schemas/AuthUser",
                        },
                        accessToken: {
                            type: "string",
                            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        },
                        refreshToken: {
                            type: "string",
                            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        },
                    },
                    required: ["user", "accessToken", "refreshToken"],
                },
                PantryItem: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            example: 10,
                        },
                        userId: {
                            type: "integer",
                            example: 1,
                        },
                        acquiredAt: {
                            type: "string",
                            format: "date-time",
                        },
                        expiresAt: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                        },
                        quantity: {
                            type: "number",
                            format: "float",
                            nullable: true,
                            default: 1,
                            example: 1.5,
                        },
                        unit: {
                            $ref: "#/components/schemas/Unit",
                            nullable: true,
                            default: "UNIT",
                        },
                        conservation: {
                            $ref: "#/components/schemas/Conservation",
                        },
                        shopId: {
                            type: "integer",
                            nullable: true,
                            example: 3,
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                        },
                        ingredient: {
                            type: "object",
                            properties: {
                                id: { type: "integer", example: 2 },
                                name: { type: "string", example: "Tomato" },
                                category: {
                                    type: "object",
                                    properties: {
                                        id: { type: "integer", example: 1 },
                                        name: { type: "string", example: "Vegetables" },
                                        icon: { type: "string", example: "test" },
                                    },
                                    required: ["id", "name", "icon"],
                                },
                            },
                            required: ["id", "name", "category"],
                        },
                        shop: {
                            type: "object",
                            nullable: true,
                            properties: {
                                id: { type: "integer", example: 3 },
                                name: { type: "string", example: "Mercadona" },
                            },
                            required: ["id", "name"],
                        },
                    },
                    required: [
                        "id",
                        "userId",
                        "acquiredAt",
                        "expiresAt",
                        "quantity",
                        "unit",
                        "conservation",
                        "createdAt",
                        "updatedAt",
                        "ingredient",
                        "shop",
                    ],
                },
                Error: {
                    type: "object",
                    properties: {
                        ok: {
                            type: "boolean",
                            example: false,
                        },
                        error: {
                            type: "object",
                            properties: {
                                code: {
                                    type: "string",
                                    example: "VALIDATION_ERROR",
                                },
                                message: {
                                    type: "string",
                                    example: "Invalid request body",
                                },
                                details: {
                                    type: "object",
                                },
                            },
                            required: ["code", "message"],
                        },
                    },
                    required: ["ok", "error"],
                },
                Success: {
                    type: "object",
                    properties: {
                        ok: {
                            type: "boolean",
                            example: true,
                        },
                        data: {
                            type: "object",
                        },
                    },
                    required: ["ok", "data"],
                },
            },
        },
    },
    apis: ["src/routes/**/*.ts", "src/modules/**/*.ts", "src/index.ts"],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
