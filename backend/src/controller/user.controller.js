import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import crypto from "crypto"
import { sendEmail } from "../utils/sendEmail.js";

const VERIFICATION_CODE_EXPIRY_MS=10*60*1000; // 10 minutes

const hashCode=(code)=>crypto.createHash("sha256").update(code).digest("hex");

const generateAccessAndRefereshToken=async(userId)=>{
    try {
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
    
        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false})
        
        return{accessToken,refreshToken};
    } catch (error) {
        throw new ApiError(500,"something went wrong in generate acces and referesh token")
    }

}

const userRegister=asyncHandler(async (req,res)=>{
    const {fullName,email,username,password}=req.body;

    if([fullName,email,username,password].some((field)=>!field || String(field).trim()==="")){
        throw new ApiError(400,"all field are required");
    }

    const existedUser=await User.findOne({
        $or:[{username:username.toLowerCase()},{email:email.toLowerCase()}]
    })
    if(existedUser){
        throw new ApiError(409,"user with email or username already exists")
    }

    const user=await User.create({
        fullName,
        email,
        username:username.toLowerCase(),
        password
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"somthing went wrong in user creation")
    }
    return res.status(201)
              .json(new ApiResponse(201,createdUser,"User registered successfully"))
})

const userLogin=asyncHandler(async(req,res)=>{
    const {email,username,password}=req.body;

    if(!(username || email) || !password){
        throw new ApiError(400,"all the credentials are required to login")
    }
    const user=await User.findOne({
        $or:[{username:username?.toLowerCase()},{email:email?.toLowerCase()}]
    })
    if(!user){
        throw new ApiError(404,"user not found")
    }

    const isPasswordValid=await user.isPasswordCorrect(password)
        if(!isPasswordValid){
            throw new ApiError(401,"invalid credentials")
        }

const { accessToken, refreshToken } = await generateAccessAndRefereshToken(user._id);
        const loggegInUser=await User.findById(user._id).select("-password -refreshToken")

        const options={
            httpOnly:true,
            secure:true
        }
    return res.status(200)
                .cookie("accessToken",accessToken,options)
                .cookie("refreshToken",refreshToken,options)
                .json(new ApiResponse(200,
                    {
                        user:loggegInUser,accessToken,refreshToken
                    },
                    "user logged in successfully"
                ))
})

const userLogout=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,
        {
            $unset:{
                refreshToken:1
            }
        }
    )

    const option={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
            .clearCookie("accessToken",option)
            .clearCookie("refreshToken",option)
            .json(new ApiResponse(200,{},"User logged out successfully"))
})

const changeUserPassword=asyncHandler(async(req,res)=>{
    const {newPassword,oldPassword}=req.body;
    if(!(newPassword && oldPassword)){
        throw new ApiError(400,"enter the credential for update the password")
    }

    const user=await User.findById(req.user._id);

    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400,"invalid old password")
    }
    user.password=newPassword;
    await user.save({validateBeforeSave:false})

    return res.status(200)
            .json(new ApiResponse(200,{},"password updated successfully"))
})

const refreshTokenAccess = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "invalid refresh token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefereshToken(user._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "access token refreshed"));
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token");
    }
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200 ,req.user,"current user fetched succesfully"))
})

const forgotPassword=asyncHandler(async(req,res)=>{
    const {email}=req.body;
    if(!email || email.trim()===""){
        throw new ApiError(400,"email is required")
    }

    const user=await User.findOne({email:email.toLowerCase().trim()})

    // same response whether or not the email exists, so accounts can't be enumerated
    const response=new ApiResponse(200,{},"if an account exists for this email, a verification code has been sent")
    if(!user){
        return res.status(200).json(response)
    }

    const code=crypto.randomInt(100000,1000000).toString(); // random number is generated 

    user.verificationCode=hashCode(code);
    user.verificationCodeExpiry=new Date(Date.now()+VERIFICATION_CODE_EXPIRY_MS);
    await user.save({validateBeforeSave:false})

    try {
        await sendEmail({
            to:user.email,
            subject:"Your password reset verification code",
            text:`Your verification code is ${code}. It expires in 10 minutes.`,
            html:`<p>Your verification code is <b>${code}</b>.</p><p>It expires in 10 minutes. If you did not request a password reset, ignore this email.</p>`
        })
    } catch (error) {
        user.verificationCode=undefined;
        user.verificationCodeExpiry=undefined;
        await user.save({validateBeforeSave:false})
        throw new ApiError(500,"failed to send verification email")
    }

    return res.status(200).json(response)
})

const resetPassword=asyncHandler(async(req,res)=>{
    const {email,code,newPassword}=req.body;
    if([email,code,newPassword].some((field)=>!field || String(field).trim()==="")){
        throw new ApiError(400,"email, code and new password are required")
    }

    const user=await User.findOne({email:email.toLowerCase().trim()})

    if(
        !user ||
        !user.verificationCode ||
        user.verificationCode!==hashCode(String(code).trim()) ||
        user.verificationCodeExpiry<Date.now()
    ){
        throw new ApiError(400,"invalid or expired verification code")
    }

    user.password=newPassword;
    user.isVerified=true;
    user.verificationCode=undefined;
    user.verificationCodeExpiry=undefined;
    user.refreshToken=undefined; // log out existing sessions
    await user.save({validateBeforeSave:false})

    return res.status(200)
            .json(new ApiResponse(200,{},"password reset successfully"))
})


export {
    userRegister,
    userLogin,
    userLogout,
    changeUserPassword,
    refreshTokenAccess,
    getCurrentUser,
    forgotPassword,
    resetPassword
};