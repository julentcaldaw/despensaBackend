import { Request, Response } from "express";
import { updateUserProfile, UserError } from "./users.service.js";

/**
 * @openapi
 * /api/users/profile:
 *   patch:
 *     summary: Actualiza el perfil del usuario autenticado
 *     description: Permite al usuario actualizar su email, nombre de usuario o contraseña.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               currentPassword:
 *                 type: string
 *             required:
 *               - currentPassword
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
export async function updateProfileController(req: Request, res: Response) {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } });
		}
		const { username, email, password, currentPassword } = req.body;
		const updated = await updateUserProfile({
			userId,
			username,
			email,
			password,
			currentPassword,
		});
		return res.json({ ok: true, data: updated });
	} catch (err) {
		if (err instanceof UserError) {
			return res.status(err.status).json({ ok: false, error: { code: err.code, message: err.message, details: err.details } });
		}
		return res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } });
	}
}
