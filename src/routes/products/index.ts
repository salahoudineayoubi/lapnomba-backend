import { Router } from "express";
import batchRoutes from "./batch";

const router = Router();

router.use("/batch", batchRoutes);

export default router;