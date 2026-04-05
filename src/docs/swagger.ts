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
    apis: ["src/routes/**/*.ts", "src/index.ts"],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
