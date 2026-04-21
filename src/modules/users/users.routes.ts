import { Router } from "express";
import { authenticateUser } from "../../middlewares/auth.middleware.js";
import { updateProfileController } from "./users.controller.js";

const usersRouter = Router();

// PATCH /api/users/profile
usersRouter.patch("/profile", authenticateUser, updateProfileController);

export { usersRouter };
