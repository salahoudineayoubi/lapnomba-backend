import { Router } from "express";
import loginRoute from "./login/";
import registerRoute from "./register";
import logoutRoute from "./logout";

const router = Router();

router.use("/login", loginRoute);
router.use("/register", registerRoute);
router.use("/logout", logoutRoute);

export default router;
