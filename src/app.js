import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app=express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(cookieParser());

app.get("/",(req,res)=>{
    res.send("Server is running on port 8000 successfully")
})

import userRouter from './routes/user.routes.js'
  
// routes declaration
app.use("/api/v1/users", userRouter);  // http://localhost:8000/api/v1/users/register

export {app};