import cloudinary from "../lib/cloudinary.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { io, userSocketMap } from "../server.js";

//Getting all the users except the logged in user
export const getUsersForSidebar = async(req,res)=>{
    try {
        const userId = req.user._id;
        const filteredUsers = await User.find({_id:{$ne:userId}}).select("-password") // id != (not equals -> ne) to logged in user
        // count number of messages not seen
        const unseenMessages = {}
        const promises = filteredUsers.map(async(user)=>{ //Because the function is async, each iteration returns a Promise.
            const messages = await Message.find({senderId :user._id , receiverId:userId , seen:false})

            if(messages.length > 0){
                unseenMessages[user._id] = messages.length;
            }
        })

        await Promise.all(promises)
        res.json({success:true,users:filteredUsers,unseenMessages})
    } catch (error) {
        
    }
}

//Get all messages for selected users
export const getMessages = async(req,res)=>{
    try {
        const {id} = req.params;
        const selectedUserId = id;
        const myId = req.user._id;

        const messages = await Message.find({
            $or:[
                {senderId:myId , receiverId:selectedUserId},
                {senderId:selectedUserId , receiverId:myId}
            ]
        })
        
        // mark messages as seen 
        await Message.updateMany({
            senderId:selectedUserId,
            receiverId:myId,
        },{seen:true});

        res.json({success:true,messages})
    } catch (error) {
        console.log(error.message)
        res.json({success:false,message:error.message})
    }
}

// to mark message as seen using message id 

export const markMessageAsSeen = async(req,res)=>{
    try {
        const {id} = req.params;
        const messageId = id;

        await Message.findByIdAndUpdate(messageId,{seen:true});
        res.json({success:true})
        
    } catch (error) {
        console.log(error.message)
        res.json({success:false,message:error.message})
    }
}

// send message to selected user
export const sendMessage = async(req,res)=>{
    try {
        const{text,image} = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id; // logged in user

        let imageUrl;

        if(image){
            const upload = await cloudinary.uploader.upload(image);

            imageUrl = upload.secure_url;


        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            image:imageUrl,
        })
        const receiverSocketId = userSocketMap[receiverId]

        if(receiverSocketId){
            io.to(receiverSocketId).emit('newMessage',newMessage)
        }

        res.json({success:true , message:newMessage})


    } catch (error) {
        console.log(error.message)
        res.json({success:false,message:error.message})
    }
}