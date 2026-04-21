import { comparePassword, hashPassword } from "../../lib/hash.js";
import { prisma } from "../../lib/prisma.js";

export class UserError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "UserError";
  }
}

export async function updateUserProfile({
  userId,
  username,
  email,
  password,
  currentPassword,
}: {
  userId: number;
  username?: string;
  email?: string;
  password?: string;
  currentPassword: string;
}): Promise<any> {
  // Obtener usuario actual
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UserError("NOT_FOUND", 404, "Usuario no encontrado");

  // Si se cambia email o username, comprobar unicidad
  if (email && email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new UserError("EMAIL_TAKEN", 409, "El email ya está en uso");
  }
  if (username && username !== user.username) {
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) throw new UserError("USERNAME_TAKEN", 409, "El nombre de usuario ya está en uso");
  }

  // Si se cambia email, username o password, pedir contraseña actual
  if ((email && email !== user.email) || (username && username !== user.username) || password) {
    if (!currentPassword) throw new UserError("CURRENT_PASSWORD_REQUIRED", 400, "Debes indicar tu contraseña actual");
    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) throw new UserError("INVALID_PASSWORD", 401, "La contraseña actual no es correcta");
  }

  // Preparar datos a actualizar
  const data: any = {};
  if (username) data.username = username;
  if (email) data.email = email;
  if (password) data.password = await hashPassword(password);

  if (Object.keys(data).length === 0) throw new UserError("NO_CHANGES", 400, "No hay cambios para actualizar");

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      avatar: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return updated;
}
