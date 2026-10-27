import { Router } from "express";
import { userLogin, userLogout, userRegister,changeUserPassword } from "../controller/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router=Router();


router.route("/register").post(userRegister);

router.route("/login").post(userLogin);

router.route("/logout").post(verifyJWT,userLogout)

router.route("/change-password").patch(changeUserPassword);


export default router;