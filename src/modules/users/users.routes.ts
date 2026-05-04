import { Router } from "express";
import { authenticateUser } from "../../middlewares/auth.middleware.js";
import { updateProfileController } from "./users.controller.js";

const usersRouter = Router();

usersRouter.patch("/profile", authenticateUser, updateProfileController);

export { usersRouter };
