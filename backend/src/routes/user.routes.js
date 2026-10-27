import { Router } from "express";
import { 
    userLogin, 
    userLogout, 
    userRegister,
    changeUserPassword,
    getCurrentUser,
    refreshTokenAccess,
    forgotPassword,
    resetPassword
} from "../controller/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router=Router();


router.route("/register").post(userRegister);

router.route("/login").post(userLogin);

router.route("/logout").post(verifyJWT,userLogout)

router.route("/change-password").patch(verifyJWT,changeUserPassword);

router.route("/current-user").get(verifyJWT,getCurrentUser)

router.route("/refresh-token").post(refreshTokenAccess)

router.route("/forgot-password").post(forgotPassword)

router.route("/reset-password").post(resetPassword)

export default router;