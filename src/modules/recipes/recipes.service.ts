import type { Difficulty } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";

export class RecipeError extends Error {
	constructor(
		public readonly code: string,
		public readonly status: number,
		message: string,
		public readonly details?: unknown
	) {
		super(message);
		this.name = "RecipeError";
	}
}

export type RecipeIngredientInput = {
	ingredientId: number;
	quantity?: number | null;
	unit?: string | null;
};

export type CreateRecipeInput = {
	name: string;
	difficulty: Difficulty;
	prepTime: number;
	ingredients: RecipeIngredientInput[];
};

export type UpdateRecipeInput = {
	name?: string;
	difficulty?: Difficulty;
	prepTime?: number;
	ingredients?: RecipeIngredientInput[];
};

export type RecipeListItem = {
	id: number;
	name: string;
	difficulty: Difficulty;
	prepTime: number;
	createdAt: Date;
	updatedAt: Date;
	like: boolean;
	author: {
		id: number;
		username: string;
		avatar: string | null;
	};
	ingredientsCount: number;
};

export type CookableRecipesResult = {
	cookable: CookableRecipeListItem[];
	almostCookable: CookableRecipeListItem[];
};

export type CookableRecipeListItem = RecipeListItem & {
	ingredients: Array<{
		ingredientId: number;
		quantity: number | null;
		unit: string | null;
		inStock: boolean;
		ingredient: {
			id: number;
			name: string;
			category: {
				id: number;
				name: string;
				icon: string;
			};
		};
	}>;
};

export type RecipeResult = {
	id: number;
	name: string;
	difficulty: Difficulty;
	prepTime: number;
	authorId: number;
	createdAt: Date;
	updatedAt: Date;
	author: {
		id: number;
		username: string;
		avatar: string | null;
	};
	ingredients: Array<{
		ingredientId: number;
		quantity: number | null;
		unit: string | null;
		ingredient: {
			id: number;
			name: string;
			category: {
				id: number;
				name: string;
				icon: string;
			};
		};
	}>;
};

const RECIPE_SELECT = {
	id: true,
	name: true,
	difficulty: true,
	prepTime: true,
	authorId: true,
	createdAt: true,
	updatedAt: true,
	author: {
		select: {
			id: true,
			username: true,
			avatar: true,
		},
	},
	ingredients: {
		select: {
			ingredientId: true,
			quantity: true,
			unit: true,
			ingredient: {
				select: {
					id: true,
					name: true,
					category: {
						select: {
							id: true,
							name: true,
							icon: true,
						},
					},
				},
			},
		},
		orderBy: {
			ingredientId: "asc",
		},
	},
} as const;

async function ensureIngredientsExist(ingredientIds: number[]): Promise<void> {
	if (ingredientIds.length === 0) {
		throw new RecipeError("VALIDATION_ERROR", 400, "ingredients must contain at least one item");
	}

	const uniqueIngredientIds = Array.from(new Set(ingredientIds));
	if (uniqueIngredientIds.length !== ingredientIds.length) {
		throw new RecipeError("VALIDATION_ERROR", 400, "ingredients cannot contain duplicate ingredientId values");
	}

	const existing = await prisma.ingredient.findMany({
		where: { id: { in: uniqueIngredientIds } },
		select: { id: true },
	});

	if (existing.length !== uniqueIngredientIds.length) {
		const found = new Set(existing.map((item) => item.id));
		const missingIds = uniqueIngredientIds.filter((id) => !found.has(id));

		throw new RecipeError("INGREDIENT_NOT_FOUND", 404, "One or more ingredients were not found", {
			missingIngredientIds: missingIds,
		});
	}
}

export async function listRecipes(userId: number): Promise<RecipeListItem[]> {
	const recipes = await prisma.recipe.findMany({
		orderBy: [
			{ createdAt: "desc" },
			{ id: "desc" },
		],
		select: {
			id: true,
			name: true,
			difficulty: true,
			prepTime: true,
			createdAt: true,
			updatedAt: true,
			savedBy: {
				where: { userId },
				select: { userId: true },
				take: 1,
			},
			author: {
				select: {
					id: true,
					username: true,
					avatar: true,
				},
			},
			_count: {
				select: {
					ingredients: true,
				},
			},
		},
	});

	return recipes.map((recipe) => ({
		id: recipe.id,
		name: recipe.name,
		difficulty: recipe.difficulty,
		prepTime: recipe.prepTime,
		createdAt: recipe.createdAt,
		updatedAt: recipe.updatedAt,
		like: recipe.savedBy.length > 0,
		author: recipe.author,
		ingredientsCount: recipe._count.ingredients,
	}));
}

export async function listCookableRecipes(userId: number): Promise<CookableRecipesResult> {
	const pantryIngredientRows = await prisma.pantryItem.findMany({
		where: { userId },
		select: { ingredientId: true },
		distinct: ["ingredientId"],
	});

	const pantryIngredientSet = new Set(pantryIngredientRows.map((row) => row.ingredientId));
	if (pantryIngredientSet.size === 0) {
		return {
			cookable: [],
			almostCookable: [],
		};
	}

	const recipes = await prisma.recipe.findMany({
		where: {
			ingredients: {
				some: {},
			},
		},
		orderBy: [
			{ createdAt: "desc" },
			{ id: "desc" },
		],
		select: {
			id: true,
			name: true,
			difficulty: true,
			prepTime: true,
			createdAt: true,
			updatedAt: true,
			savedBy: {
				where: { userId },
				select: { userId: true },
				take: 1,
			},
			author: {
				select: {
					id: true,
					username: true,
					avatar: true,
				},
			},
			_count: {
				select: {
					ingredients: true,
				},
			},
			ingredients: {
				select: {
					ingredientId: true,
					quantity: true,
					unit: true,
					ingredient: {
						select: {
							id: true,
							name: true,
							category: {
								select: {
									id: true,
									name: true,
									icon: true,
								},
							},
						},
					},
				},
				orderBy: {
					ingredientId: "asc",
				},
			},
		},
	});

	const cookable: CookableRecipeListItem[] = [];
	const almostCookable: CookableRecipeListItem[] = [];

	for (const recipe of recipes) {
		const totalIngredients = recipe.ingredients.length;
		if (totalIngredients === 0) {
			continue;
		}

		const ingredients = recipe.ingredients.map((row) => ({
			ingredientId: row.ingredientId,
			quantity: row.quantity,
			unit: row.unit,
			inStock: pantryIngredientSet.has(row.ingredientId),
			ingredient: row.ingredient,
		}));

		const availableIngredients = ingredients.filter((item) => item.inStock).length;

		const missingIngredients = totalIngredients - availableIngredients;
		const availabilityRatio = availableIngredients / totalIngredients;

		const mapped: CookableRecipeListItem = {
			id: recipe.id,
			name: recipe.name,
			difficulty: recipe.difficulty,
			prepTime: recipe.prepTime,
			createdAt: recipe.createdAt,
			updatedAt: recipe.updatedAt,
			like: recipe.savedBy.length > 0,
			author: recipe.author,
			ingredientsCount: recipe._count.ingredients,
			ingredients,
		};

		if (missingIngredients === 0) {
			cookable.push(mapped);
			continue;
		}

		if (availabilityRatio > 0.75 && missingIngredients <= 4) {
			almostCookable.push(mapped);
		}
	}

	return {
		cookable,
		almostCookable,
	};
}

export async function getRecipeById(recipeId: number): Promise<RecipeResult> {
	const recipe = await prisma.recipe.findUnique({
		where: { id: recipeId },
		select: RECIPE_SELECT,
	});

	if (!recipe) {
		throw new RecipeError("RECIPE_NOT_FOUND", 404, "Recipe not found", { recipeId });
	}

	return recipe;
}

export async function setRecipeLike(userId: number, recipeId: number, liked: boolean): Promise<void> {
	const recipe = await prisma.recipe.findUnique({
		where: { id: recipeId },
		select: { id: true },
	});

	if (!recipe) {
		throw new RecipeError("RECIPE_NOT_FOUND", 404, "Recipe not found", { recipeId });
	}

	if (liked) {
		await prisma.userSavedRecipe.upsert({
			where: {
				userId_recipeId: {
					userId,
					recipeId,
				},
			},
			update: {},
			create: {
				userId,
				recipeId,
			},
		});
		return;
	}

	await prisma.userSavedRecipe.deleteMany({
		where: {
			userId,
			recipeId,
		},
	});
}

export async function createRecipe(userId: number, input: CreateRecipeInput): Promise<RecipeResult> {
	await ensureIngredientsExist(input.ingredients.map((item) => item.ingredientId));

	return prisma.recipe.create({
		data: {
			name: input.name,
			authorId: userId,
			difficulty: input.difficulty,
			prepTime: input.prepTime,
			ingredients: {
				create: input.ingredients.map((item) => ({
					ingredientId: item.ingredientId,
					quantity: item.quantity ?? null,
					unit: item.unit ?? null,
				})),
			},
		},
		select: RECIPE_SELECT,
	});
}

export async function updateRecipe(userId: number, recipeId: number, input: UpdateRecipeInput): Promise<RecipeResult> {
	const existing = await prisma.recipe.findUnique({
		where: { id: recipeId },
		select: { id: true, authorId: true },
	});

	if (!existing) {
		throw new RecipeError("RECIPE_NOT_FOUND", 404, "Recipe not found", { recipeId });
	}

	if (existing.authorId !== userId) {
		throw new RecipeError("FORBIDDEN", 403, "You can only update your own recipes", { recipeId });
	}

	if (Object.prototype.hasOwnProperty.call(input, "ingredients")) {
		await ensureIngredientsExist((input.ingredients ?? []).map((item) => item.ingredientId));
	}

	return prisma.recipe.update({
		where: { id: recipeId },
		data: {
			name: input.name,
			difficulty: input.difficulty,
			prepTime: input.prepTime,
			ingredients: Object.prototype.hasOwnProperty.call(input, "ingredients")
				? {
					deleteMany: {},
					create: (input.ingredients ?? []).map((item) => ({
						ingredientId: item.ingredientId,
						quantity: item.quantity ?? null,
						unit: item.unit ?? null,
					})),
				}
				: undefined,
		},
		select: RECIPE_SELECT,
	});
}

export async function deleteRecipe(userId: number, recipeId: number): Promise<void> {
	const existing = await prisma.recipe.findUnique({
		where: { id: recipeId },
		select: { id: true, authorId: true },
	});

	if (!existing) {
		throw new RecipeError("RECIPE_NOT_FOUND", 404, "Recipe not found", { recipeId });
	}

	if (existing.authorId !== userId) {
		throw new RecipeError("FORBIDDEN", 403, "You can only delete your own recipes", { recipeId });
	}

	await prisma.recipe.delete({
		where: { id: recipeId },
	});
}
