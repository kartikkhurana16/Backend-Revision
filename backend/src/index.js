import "dotenv/config";
import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log("server is running on port",process.env.PORT);
    })

    app.on("error",(err)=>{
        console.log("error",err);
        throw err;
    })
})
.catch((err)=>{
    console.log(`mongodb connection failed : ${err}` );
})