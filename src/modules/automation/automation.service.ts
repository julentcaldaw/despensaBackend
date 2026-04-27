type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

import { prisma } from "../../lib/prisma.js";

export type TriggerWorkflowInput = {
	recipe: JsonValue;
};

export type TriggerRecipeAutomationInput = {
	recipeId: number;
	recipeName: string;
};

export type TriggerWorkflowBatchInput = {
	firstRecipeId: number;
	totalRecipes: number;
};

export type TriggerWorkflowBatchItemResult = {
	recipeId: number;
	recipeName: string;
	ok: boolean;
	error?: {
		code: string;
		message: string;
	};
};

export type TriggerWorkflowBatchResult = {
	firstRecipeId: number;
	totalRecipes: number;
	processedRecipes: number;
	nextRecipeId: number;
	results: TriggerWorkflowBatchItemResult[];
};

export type TriggerWorkflowResult = {
	data: JsonValue;
};

export type ExecutionDetails = {
	id: string;
	status?: string;
	finished?: boolean;
	startedAt?: string;
	stoppedAt?: string;
	data: JsonValue;
};

export class AutomationError extends Error {
	constructor(
		public readonly code: string,
		public readonly status: number,
		message: string,
		public readonly details?: unknown
	) {
		super(message);
		this.name = "AutomationError";
	}
}

function getN8nBaseUrl(): string {
	const value = process.env.N8N_BASE_URL?.trim();
	if (!value) {
		throw new AutomationError("N8N_CONFIG_ERROR", 500, "N8N_BASE_URL environment variable is not set");
	}

	return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getN8nWebhookUrl(): string {
	const value = process.env.N8N_URL?.trim();
	if (!value) {
		throw new AutomationError("N8N_CONFIG_ERROR", 500, "N8N_URL environment variable is not set");
	}

	try {
		new URL(value);
	} catch {
		throw new AutomationError("N8N_CONFIG_ERROR", 500, "N8N_URL must be a valid URL");
	}

	return value;
}

function getN8nApiKey(): string {
	const value = process.env.N8N_API_KEY?.trim();
	if (!value) {
		throw new AutomationError("N8N_CONFIG_ERROR", 500, "N8N_API_KEY environment variable is not set");
	}

	return value;
}

function getN8nUser(): string {
	const value = process.env.N8N_USER?.trim();
	if (!value) {
		throw new AutomationError("N8N_CONFIG_ERROR", 500, "N8N_USER environment variable is not set");
	}

	return value;
}

function getN8nPassword(): string {
	const value = process.env.N8N_PASSWORD?.trim();
	if (!value) {
		throw new AutomationError("N8N_CONFIG_ERROR", 500, "N8N_PASSWORD environment variable is not set");
	}

	return value;
}

function getTimeoutMs(): number {
	const value = process.env.N8N_TIMEOUT_MS;
	if (!value) {
		return 15000;
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new AutomationError("N8N_CONFIG_ERROR", 500, "N8N_TIMEOUT_MS must be a positive number");
	}

	return parsed;
}

function buildJsonHeaders(): Record<string, string> {
	return {
		"Content-Type": "application/json",
	};
}

function buildApiHeaders(): Record<string, string> {
	return {
		...buildJsonHeaders(),
		"X-N8N-API-KEY": getN8nApiKey(),
	};
}

function buildWebhookHeaders(): Record<string, string> {
	const credentials = Buffer.from(`${getN8nUser()}:${getN8nPassword()}`).toString("base64");

	return {
		...buildJsonHeaders(),
		Authorization: `Basic ${credentials}`,
	};
}

async function parseResponseBody(response: Response): Promise<JsonValue> {
	const text = await response.text();
	if (!text) {
		return null;
	}

	try {
		return JSON.parse(text) as JsonValue;
	} catch {
		return text;
	}
}

async function n8nRequest(url: string, init: RequestInit): Promise<JsonValue> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

	try {
		const response = await fetch(url, {
			...init,
			headers: {
				...buildJsonHeaders(),
				...(init.headers ?? {}),
			},
			signal: controller.signal,
		});

		const body = await parseResponseBody(response);
		if (!response.ok) {
			throw new AutomationError(
				"N8N_REQUEST_FAILED",
				response.status,
				"n8n request failed",
				{ url, body }
			);
		}

		return body;
	} catch (error) {
		if (error instanceof AutomationError) {
			throw error;
		}

		if (error instanceof Error && error.name === "AbortError") {
			throw new AutomationError("N8N_TIMEOUT", 504, "n8n request timed out", { url });
		}

		throw new AutomationError("N8N_UNAVAILABLE", 502, "n8n is unavailable", {
			url,
			error: error instanceof Error ? error.message : String(error),
		});
	} finally {
		clearTimeout(timeout);
	}
}

async function n8nApiRequest(path: string, init: RequestInit): Promise<JsonValue> {
	return n8nRequest(`${getN8nBaseUrl()}${path}`, {
		...init,
		headers: {
			...buildApiHeaders(),
			...(init.headers ?? {}),
		},
	});
}

export async function triggerWorkflow(input: TriggerWorkflowInput): Promise<TriggerWorkflowResult> {
	if (!Object.prototype.hasOwnProperty.call(input, "recipe")) {
		throw new AutomationError("VALIDATION_ERROR", 400, "recipe is required");
	}

	const body = await n8nRequest(getN8nWebhookUrl(), {
		method: "POST",
		headers: buildWebhookHeaders(),
		body: JSON.stringify({ recipe: input.recipe }),
	});

	return {
		data: body,
	};
}

export async function triggerRecipeWorkflow(input: TriggerRecipeAutomationInput): Promise<TriggerWorkflowResult> {
	if (!Number.isInteger(input.recipeId) || input.recipeId <= 0) {
		throw new AutomationError("VALIDATION_ERROR", 400, "recipeId must be a positive integer");
	}

	if (input.recipeName.trim().length === 0) {
		throw new AutomationError("VALIDATION_ERROR", 400, "recipeName must be a non-empty string");
	}

	return triggerWorkflow({
		recipe: {
			id: input.recipeId,
			name: input.recipeName.trim(),
		},
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function triggerRecipeWorkflowBatch(
	input: TriggerWorkflowBatchInput
): Promise<TriggerWorkflowBatchResult> {
	if (!Number.isInteger(input.firstRecipeId) || input.firstRecipeId <= 0) {
		throw new AutomationError("VALIDATION_ERROR", 400, "firstRecipeId must be a positive integer");
	}

	if (!Number.isInteger(input.totalRecipes) || input.totalRecipes <= 0) {
		throw new AutomationError("VALIDATION_ERROR", 400, "totalRecipes must be a positive integer");
	}

	const firstRecipeId = input.firstRecipeId;
	const totalRecipes = input.totalRecipes;
	const delayMs = 10000;

	const expectedIds = Array.from({ length: totalRecipes }, (_, index) => firstRecipeId + index);
	const recipes = await prisma.recipe.findMany({
		where: {
			id: {
				in: expectedIds,
			},
		},
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			id: "asc",
		},
	});

	if (recipes.length !== expectedIds.length) {
		const foundIds = new Set(recipes.map((recipe) => recipe.id));
		const missingIds = expectedIds.filter((id) => !foundIds.has(id));
		throw new AutomationError("RECIPES_NOT_FOUND", 404, "Some recipes were not found", {
			missingRecipeIds: missingIds,
		});
	}

	const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
	const results: TriggerWorkflowBatchItemResult[] = [];

	for (let index = 0; index < expectedIds.length; index += 1) {
		const recipeId = expectedIds[index];
		const recipe = recipesById.get(recipeId);

		if (!recipe) {
			throw new AutomationError("RECIPES_NOT_FOUND", 404, "Recipe was not found", {
				recipeId,
			});
		}

		try {
			console.log(
				`[automation:batch] [${index + 1}/${expectedIds.length}] calling recipeId=${recipe.id} recipeName=\"${recipe.name}\"`
			);

			await triggerRecipeWorkflow({
				recipeId: recipe.id,
				recipeName: recipe.name,
			});

			console.log(
				`[automation:batch] [${index + 1}/${expectedIds.length}] response OK recipeId=${recipe.id}`
			);

			results.push({
				recipeId: recipe.id,
				recipeName: recipe.name,
				ok: true,
			});
		} catch (error) {
			if (error instanceof AutomationError) {
				console.error(
					`[automation:batch] [${index + 1}/${expectedIds.length}] response ERROR recipeId=${recipe.id} code=${error.code} message=\"${error.message}\"`
				);

				results.push({
					recipeId: recipe.id,
					recipeName: recipe.name,
					ok: false,
					error: {
						code: error.code,
						message: error.message,
					},
				});
			} else {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error(
					`[automation:batch] [${index + 1}/${expectedIds.length}] response ERROR recipeId=${recipe.id} code=INTERNAL_ERROR message=\"${errorMessage}\"`
				);

				results.push({
					recipeId: recipe.id,
					recipeName: recipe.name,
					ok: false,
					error: {
						code: "INTERNAL_ERROR",
						message: error instanceof Error ? error.message : String(error),
					},
				});
			}
		}

		if (index < expectedIds.length - 1) {
			await sleep(delayMs);
		}
	}

	return {
		firstRecipeId,
		totalRecipes,
		processedRecipes: results.length,
		nextRecipeId: firstRecipeId + totalRecipes,
		results,
	};
}

export async function getExecution(executionId: string): Promise<ExecutionDetails> {
	const normalizedId = executionId.trim();
	if (!normalizedId) {
		throw new AutomationError("VALIDATION_ERROR", 400, "executionId is required");
	}

	const body = await n8nApiRequest(`/api/v1/executions/${encodeURIComponent(normalizedId)}`, {
		method: "GET",
	});

	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return {
			id: normalizedId,
			data: body,
		};
	}

	const mapped = body as Record<string, unknown>;
	return {
		id: typeof mapped.id === "string" ? mapped.id : normalizedId,
		status: typeof mapped.status === "string" ? mapped.status : undefined,
		finished: typeof mapped.finished === "boolean" ? mapped.finished : undefined,
		startedAt: typeof mapped.startedAt === "string" ? mapped.startedAt : undefined,
		stoppedAt: typeof mapped.stoppedAt === "string" ? mapped.stoppedAt : undefined,
		data: body,
	};
}
