import { Router } from "express";
import { getCountries } from "./controller";

const router = Router();

router.get("/", getCountries);

export default router;