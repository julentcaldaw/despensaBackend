import type { Difficulty } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";
import { triggerRecipeWorkflow } from "../automation/automation.service.js";

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
	detail?: string | null;
	image?: string | null;
	difficulty: Difficulty;
	prepTime: number;
	ingredients: RecipeIngredientInput[];
};

export type UpdateRecipeInput = {
	name?: string;
	detail?: string | null;
	image?: string | null;
	difficulty?: Difficulty;
	prepTime?: number;
	ingredients?: RecipeIngredientInput[];
};

export type RecipeListItem = {
	id: number;
	name: string;
	image: string | null;
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
	availableIngredientsCount: number;
	ingredients: Array<{
		ingredientId: number;
		quantity: number | null;
		unit: string | null;
		inStock: boolean;
		inShoppingList: boolean;
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

export type RecipeSearchResultItem = {
	id: number;
	name: string;
	image: string | null;
	like: boolean;
	ingredientsCount: number;
	pantryIngredientsCount: number;
	shoppingListIngredientsCount: number;
};

export type RecipeListResponse = {
	items: RecipeListItem[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

export type CookableRecipesResult = {
	cookable: CookableRecipeListItem[];
	almostCookable: CookableRecipeListItem[];
};

export type RecipeOverviewResponse = {
	cookable: CookableRecipeListItem[];
	almostCookable: CookableRecipeListItem[];
	recipes: RecipeListResponse;
};

export type CookableRecipeListItem = RecipeListItem & {
	ingredients: Array<{
		ingredientId: number;
		quantity: number | null;
		unit: string | null;
		inStock: boolean;
		inShoppingList: boolean;
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
	detail: string | null;
	image: string | null;
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

export type RecipeDetailResult = Omit<RecipeResult, "ingredients"> & {
	liked: boolean;
	ingredients: Array<{
		ingredientId: number;
		quantity: number | null;
		unit: string | null;
		inStock: boolean;
		inShoppingList: boolean;
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
	detail: true,
	image: true,
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

async function getUserIngredientSets(userId: number): Promise<{
	pantrySet: Set<number>;
	shoppingSet: Set<number>;
}> {
	const [pantryRows, shoppingRows] = await Promise.all([
		prisma.pantryItem.findMany({
			where: { userId },
			select: { ingredientId: true },
			distinct: ["ingredientId"],
		}),
		prisma.shoppingItem.findMany({
			where: {
				userId,
				orderId: null,
			},
			select: { ingredientId: true },
			distinct: ["ingredientId"],
		}),
	]);

	return {
		pantrySet: new Set(pantryRows.map((row) => row.ingredientId)),
		shoppingSet: new Set(shoppingRows.map((row) => row.ingredientId)),
	};
}

function compareRecipesByPantryCoverage(
	a: Pick<RecipeListItem, "availableIngredientsCount" | "ingredientsCount" | "createdAt" | "like" | "id">,
	b: Pick<RecipeListItem, "availableIngredientsCount" | "ingredientsCount" | "createdAt" | "like" | "id">
): number {
	const aCoverage = a.ingredientsCount === 0 ? 0 : a.availableIngredientsCount / a.ingredientsCount;
	const bCoverage = b.ingredientsCount === 0 ? 0 : b.availableIngredientsCount / b.ingredientsCount;

	if (bCoverage !== aCoverage) {
		return bCoverage - aCoverage;
	}

	if (b.availableIngredientsCount !== a.availableIngredientsCount) {
		return b.availableIngredientsCount - a.availableIngredientsCount;
	}

	const createdAtDiff = b.createdAt.getTime() - a.createdAt.getTime();
	if (createdAtDiff !== 0) {
		return createdAtDiff;
	}

	if (a.like !== b.like) {
		return a.like ? -1 : 1;
	}

	return b.id - a.id;
}

export async function listRecipes(
	userId: number,
	page: number = 1,
	pageSize: number = 30
): Promise<RecipeListResponse> {
	// Validate pagination params
	if (!Number.isInteger(page) || page < 1) {
		throw new RecipeError("VALIDATION_ERROR", 400, "page must be a positive integer", { page });
	}
	if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
		throw new RecipeError("VALIDATION_ERROR", 400, "pageSize must be between 1 and 100", { pageSize });
	}

	// Get cookable/almostCookable recipe IDs to exclude
	const { cookable, almostCookable } = await listCookableRecipes(userId);
	const cookableIds = new Set([...cookable.map((r) => r.id), ...almostCookable.map((r) => r.id)]);
	const { pantrySet: pantryIngredientSet, shoppingSet: shoppingIngredientSet } = await getUserIngredientSets(userId);

	// Get total count of recipes (excluding cookable)
	const totalCount = await prisma.recipe.count({
		where: {
			NOT: {
				id: { in: Array.from(cookableIds) },
			},
		},
	});

	const recipes = await prisma.recipe.findMany({
		where: {
			NOT: {
				id: { in: Array.from(cookableIds) },
			},
		},
		select: {
			id: true,
			name: true,
			image: true,
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
			},
		},
	});

	const items = recipes
		.map((recipe) => {
			const availableIngredientsCount = recipe.ingredients.filter((item) =>
				pantryIngredientSet.has(item.ingredientId)
			).length;

			return {
				id: recipe.id,
				name: recipe.name,
				image: recipe.image,
				difficulty: recipe.difficulty,
				prepTime: recipe.prepTime,
				createdAt: recipe.createdAt,
				updatedAt: recipe.updatedAt,
				like: recipe.savedBy.length > 0,
				author: recipe.author,
				ingredientsCount: recipe._count.ingredients,
				availableIngredientsCount,
				ingredients: recipe.ingredients.map((item) => ({
					ingredientId: item.ingredientId,
					quantity: item.quantity,
					unit: item.unit,
					inStock: pantryIngredientSet.has(item.ingredientId),
					inShoppingList: shoppingIngredientSet.has(item.ingredientId),
					ingredient: item.ingredient,
				})),
			};
		})
		.sort(compareRecipesByPantryCoverage);

	const skip = (page - 1) * pageSize;
	const paginatedItems = items.slice(skip, skip + pageSize);

	const totalPages = Math.ceil(totalCount / pageSize);

	return {
		items: paginatedItems,
		total: totalCount,
		page,
		pageSize,
		totalPages,
	};
}

export async function searchRecipesByName(
	userId: number,
	query: string,
	limit: number
): Promise<RecipeSearchResultItem[]> {
	const trimmed = query.trim();
	if (trimmed.length === 0) {
		return [];
	}

	const normalized = trimmed.toLowerCase();
	const { pantrySet, shoppingSet } = await getUserIngredientSets(userId);

	const rows = await prisma.recipe.findMany({
		where: {
			name: {
				contains: trimmed,
				mode: "insensitive",
			},
		},
		select: {
			id: true,
			name: true,
			image: true,
			_count: {
				select: {
					ingredients: true,
				},
			},
			ingredients: {
				select: {
					ingredientId: true,
				},
			},
			savedBy: {
				where: { userId },
				select: { userId: true },
				take: 1,
			},
		},
		orderBy: [
			{ name: "asc" },
			{ id: "desc" },
		],
		take: limit,
	});

	return rows
		.sort((a, b) => {
			const aPrefix = a.name.toLowerCase().startsWith(normalized);
			const bPrefix = b.name.toLowerCase().startsWith(normalized);

			if (aPrefix === bPrefix) {
				return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
			}

			return aPrefix ? -1 : 1;
		})
		.slice(0, limit)
		.map((row) => {
			const pantryIngredientsCount = row.ingredients.filter((item) =>
				pantrySet.has(item.ingredientId)
			).length;
			const shoppingListIngredientsCount = row.ingredients.filter((item) =>
				shoppingSet.has(item.ingredientId)
			).length;

			return {
				id: row.id,
				name: row.name,
				image: row.image,
				like: row.savedBy.length > 0,
				ingredientsCount: row._count.ingredients,
				pantryIngredientsCount,
				shoppingListIngredientsCount,
			};
		});
}

export async function listCookableRecipes(userId: number): Promise<CookableRecipesResult> {
	const { pantrySet: pantryIngredientSet, shoppingSet: shoppingIngredientSet } = await getUserIngredientSets(userId);

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
			image: true,
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
			inShoppingList: shoppingIngredientSet.has(row.ingredientId),
			ingredient: row.ingredient,
		}));

		const availableIngredients = ingredients.filter((item) => item.inStock).length;

		const missingIngredients = totalIngredients - availableIngredients;
		const availabilityRatio = availableIngredients / totalIngredients;

		const mapped: CookableRecipeListItem = {
			id: recipe.id,
			name: recipe.name,
			image: recipe.image,
			difficulty: recipe.difficulty,
			prepTime: recipe.prepTime,
			createdAt: recipe.createdAt,
			updatedAt: recipe.updatedAt,
			like: recipe.savedBy.length > 0,
			author: recipe.author,
			ingredientsCount: recipe._count.ingredients,
			availableIngredientsCount: availableIngredients,
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

export async function listRecipesOverview(
	userId: number,
	page: number = 1,
	pageSize: number = 30
): Promise<RecipeOverviewResponse> {
	// Validate pagination params
	if (!Number.isInteger(page) || page < 1) {
		throw new RecipeError("VALIDATION_ERROR", 400, "page must be a positive integer", { page });
	}
	if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
		throw new RecipeError("VALIDATION_ERROR", 400, "pageSize must be between 1 and 100", { pageSize });
	}

	// Get ingredient sets once
	const { pantrySet, shoppingSet } = await getUserIngredientSets(userId);

	// Get cookable and almost cookable recipes
	if (pantrySet.size === 0) {
		const skip = (page - 1) * pageSize;

		const totalCount = await prisma.recipe.count();
		const recipes = await prisma.recipe.findMany({
			skip,
			take: pageSize,
			select: {
				id: true,
				name: true,
				image: true,
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
				},
			},
		});

		const items = recipes.map((recipe) => ({
			id: recipe.id,
			name: recipe.name,
			image: recipe.image,
			difficulty: recipe.difficulty,
			prepTime: recipe.prepTime,
			createdAt: recipe.createdAt,
			updatedAt: recipe.updatedAt,
			like: recipe.savedBy.length > 0,
			author: recipe.author,
			ingredientsCount: recipe._count.ingredients,
			availableIngredientsCount: 0,
			ingredients: recipe.ingredients.map((item) => ({
				ingredientId: item.ingredientId,
				quantity: item.quantity,
				unit: item.unit,
				inStock: false,
				inShoppingList: shoppingSet.has(item.ingredientId),
				ingredient: item.ingredient,
			})),
		}));

		return {
			cookable: [],
			almostCookable: [],
			recipes: {
				items,
				total: totalCount,
				page,
				pageSize,
				totalPages: Math.ceil(totalCount / pageSize),
			},
		};
	}

	// Get all recipes with full details
	const allRecipes = await prisma.recipe.findMany({
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
			image: true,
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
			},
		},
	});

	// Separate into cookable, almostCookable, and regular
	const cookable: CookableRecipeListItem[] = [];
	const almostCookable: CookableRecipeListItem[] = [];
	const regularRecipes: RecipeListItem[] = [];

	for (const recipe of allRecipes) {
		const totalIngredients = recipe.ingredients.length;
		if (totalIngredients === 0) {
			continue;
		}

		const ingredients = recipe.ingredients.map((row) => ({
			ingredientId: row.ingredientId,
			quantity: row.quantity,
			unit: row.unit,
			inStock: pantrySet.has(row.ingredientId),
			inShoppingList: shoppingSet.has(row.ingredientId),
			ingredient: row.ingredient,
		}));

		const availableIngredients = ingredients.filter((item) => item.inStock).length;
		const missingIngredients = totalIngredients - availableIngredients;
		const availabilityRatio = availableIngredients / totalIngredients;

		const baseMappped = {
			id: recipe.id,
			name: recipe.name,
			image: recipe.image,
			difficulty: recipe.difficulty,
			prepTime: recipe.prepTime,
			createdAt: recipe.createdAt,
			updatedAt: recipe.updatedAt,
			like: recipe.savedBy.length > 0,
			author: recipe.author,
			ingredientsCount: recipe._count.ingredients,
			availableIngredientsCount: availableIngredients,
		};

		if (missingIngredients === 0) {
			cookable.push({
				...baseMappped,
				ingredients: ingredients as CookableRecipeListItem["ingredients"],
			});
			continue;
		}

		if (availabilityRatio > 0.75 && missingIngredients <= 4) {
			almostCookable.push({
				...baseMappped,
				ingredients: ingredients as CookableRecipeListItem["ingredients"],
			});
			continue;
		}

		// Regular recipe
		regularRecipes.push({
			...baseMappped,
			ingredients: recipe.ingredients.map((item) => ({
				ingredientId: item.ingredientId,
				quantity: item.quantity,
				unit: item.unit,
				inStock: pantrySet.has(item.ingredientId),
				inShoppingList: shoppingSet.has(item.ingredientId),
				ingredient: item.ingredient,
			})),
		});
	}

	// Sort regular recipes
	const sortedRecipes = regularRecipes.sort(compareRecipesByPantryCoverage);

	// Paginate regular recipes
	const skip = (page - 1) * pageSize;
	const paginatedItems = sortedRecipes.slice(skip, skip + pageSize);
	const totalPages = Math.ceil(sortedRecipes.length / pageSize);

	return {
		cookable,
		almostCookable,
		recipes: {
			items: paginatedItems,
			total: sortedRecipes.length,
			page,
			pageSize,
			totalPages,
		},
	};
}

export async function getRecipeById(recipeId: number, userId: number): Promise<RecipeDetailResult> {
	const recipe = await prisma.recipe.findUnique({
		where: { id: recipeId },
		select: RECIPE_SELECT,
	});

	if (!recipe) {
		throw new RecipeError("RECIPE_NOT_FOUND", 404, "Recipe not found", { recipeId });
	}

	const pantryIngredientRows = await prisma.pantryItem.findMany({
		where: { userId },
		select: { ingredientId: true },
		distinct: ["ingredientId"],
	});

	const shoppingIngredientRows = await prisma.shoppingItem.findMany({
		where: {
			userId,
			orderId: null,
		},
		select: { ingredientId: true },
		distinct: ["ingredientId"],
	});

	const likedRow = await prisma.userSavedRecipe.findUnique({
		where: {
			userId_recipeId: {
				userId,
				recipeId,
			},
		},
		select: { userId: true },
	});

	const pantryIngredientSet = new Set(pantryIngredientRows.map((row) => row.ingredientId));
	const shoppingIngredientSet = new Set(shoppingIngredientRows.map((row) => row.ingredientId));

	return {
		...recipe,
		liked: Boolean(likedRow),
		ingredients: recipe.ingredients.map((item) => ({
			...item,
			inStock: pantryIngredientSet.has(item.ingredientId),
			inShoppingList: shoppingIngredientSet.has(item.ingredientId),
		})),
	};
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

	const recipe = await prisma.recipe.create({
		data: {
			name: input.name,
			detail: input.detail ?? null,
			image: input.image ?? null,
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

	try {
		await triggerRecipeWorkflow({
			recipeId: recipe.id,
			recipeName: recipe.name,
		});
	} catch {
		// Recipe creation should not fail if downstream automation is unavailable.
	}

	return recipe;
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
			detail: Object.prototype.hasOwnProperty.call(input, "detail") ? (input.detail ?? null) : undefined,
			image: Object.prototype.hasOwnProperty.call(input, "image") ? (input.image ?? null) : undefined,
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
