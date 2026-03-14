import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './lib/db.js';
import userRouter from './routes/userRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import { Server } from 'socket.io';
import http from 'http'

dotenv.config();
const app = express();
const server = http.createServer(app); // actual server for socket

app.use(cors());
app.use(express.json({limit:"4mb"}));//It allows your Express app to read JSON data sent in request bodies. blocks data > 4mb

// initialse socket.io server
export const io = new Server(server,{
    cors:{
        origin:"*"
    }
})

export const userSocketMap = {} // {userId : socketId}

// socket.io connection handler 
// User connects
//      ↓
// server gets userId
//      ↓
// store userId → socketId
//      ↓
// send online users list to everyone
//      ↓
// if user disconnects
//      ↓
// remove user from map
//      ↓
// update online users

// broadcasting a message to everyone.

// 1. Basic Syntax
// io.emit(eventName, data)

// i) eventName → name of the event
// ii) data → information sent to clients
io.on('connection',(socket)=>{
    const userId = socket.handshake.query.userId;
    console.log("user connected" , userId);

    if(userId){
        userSocketMap[userId] = socket.id;
    }

    io.emit('getOnlineUsers' , Object.keys(userSocketMap))

    socket.on('disconnect',()=>{
        console.log('user disconnected' , userId);
        delete userSocketMap[userId];
        io.emit('getOnlineUsers',Object.keys(userSocketMap))
    })
})

app.use('/api/user',userRouter)

app.use('/api/messages',messageRouter)

app.use('/',(req,res)=> res.send("Server is Live Now..."));

const PORT = process.env.PORT || 1000;
await connectDB();

server.listen(PORT,()=> console.log(`Server is running on the port: ${PORT}`));
