import { Router } from "express";
import authRoutes from "./auths";
import userRoutes from "./users";
import countries from "./countries";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/countries", countries);
export default router;
