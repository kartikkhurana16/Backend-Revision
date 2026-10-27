import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

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

    if([fullName,email,username,password].some((field)=>!field || field?.trim()==="")){
        throw new ApiError(400,"all field are required");
    }

    const existedUser=await User.findOne({
        $or:[{username},{email}]
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

    if(!(username || email) && !password){
        throw new ApiError(400,"all the credentials are required to login")
    }
    const user=await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"user not found")
    }

    const isPasswordValid=await user.isPasswordCorrect(password)
        if(!isPasswordValid){
            throw new ApiError(404,"invalid credentials")
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
            $set:{
                refreshToken:undefined
            }
        },
        {
            new :true
        }
    )

    const option={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
            .clearcookie("accessToken",option)
            .clearcookie("refreshToken",option)
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
            .json(new ApiResponse(200,"password updated succeefully"))
})



export {
    userRegister,
    userLogin,
    userLogout,
    changeUserPassword
};