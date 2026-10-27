import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB=async()=>{
    try {
        const connectInstance=await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)

        if(connectInstance){
            console.log(`MonogoDB Connected Successfully : ${connectInstance.connection.host}`);
        }
        
    } catch (error) {
        console.log(error,"connection failed with mongodb");
        process.exit(1);
    }
}
export default connectDB;