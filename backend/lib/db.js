import mongoose from "mongoose";

export const connectDB = async ()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI,{
            dbName:'QuickChatDB'
        })
        console.log("MongoDB connected...");

    } catch (error) {
        console.log("Error in DB connection",error.message);
    }
}