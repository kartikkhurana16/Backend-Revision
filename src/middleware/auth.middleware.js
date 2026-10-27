import { User } from "../model/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
export const verifyJWT=asyncHandler(async(req,res,next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("berear ", "");
    
        if(!token){
            throw new ApiError(401,"Unauthorized request")
        }
    
        const decodedToken=jwt.verifyJWT(token,process.env.ACCESS_TOKEN_SECRET)
         
       const user= User.findById(decodedToken?._id).select("-password,-refreshToken")
    
        if(!user){
            throw new ApiError(401,"invalid access token")
        }
        req.user=user;
        next();
    } catch (error) {
        throw new ApiError(401,"invalid acces token")
    }
})