import React from 'react'
import { useContext } from 'react'
import { useState } from 'react'
import { createContext } from 'react'
import { AuthContext } from './AuthContext'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

export const ChatContext = createContext()

export const ChatProvider = ({children})=>{

    const[messages,setMessages] = useState([])
    const[users , setUsers] = useState([]);
    const[selectedUser,setSelectedUser] = useState(null);
    const[unseenMessages,setUnseenMessages] = useState({}); // userId:noOfUnseenMessages
    const {socket,axios} = useContext(AuthContext)

    // function to get all users for sidebar 
    const getUsers = async()=>{
        try {
            const {data} = await axios.get('/api/messages/users')

            if(data.success){
                setUsers(data.users)
                setUnseenMessages(data.unseenMessages)
            }

        } catch (error) {
            toast.error(error,nessage)
        }
    }
    
    //function to get messages for selected user
    const getMessages = async(userId)=>{
        try {
            const {data} = await axios.get(`api/messages/${userId}`)

            if(data.success){
                setMessages(data.messages)

            }
        } catch (error) {
            toast.error(error.messsage)
        }
    }

    const sendMessage = async(messageData)=>{
        try {
            const {data} = await axios.post(`api/messages/send/${selectedUser._id}`,messageData)
            if(data.success){
                setMessages((prevMessages)=>[...prevMessages,data.message])
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // function to subscribe to messages for selected user
//     Server sends message
//         │
//         ▼
// socket.on('newMessage')
//         │
//         ▼
// Is chat with sender open?
//         │
//    ┌────┴─────┐
//    │          │
//  YES         NO
//    │          │
// Mark seen    Increase unread count
// Add to chat  Show notification badge
// Update DB
    const subscribeToMessages =async()=>{
        if(!socket) return;

        socket.on('newMessage', (newMessage)=>{
            if(selectedUser && newMessage.senderId === selectedUser._id){ //User is already viewing the //chat so message is instantly marked as seen
                newMessage.seen = true;
                setMessages((prevMessages)=>[...prevMessages,newMessage])
                axios.put(`api/messages/mark/${newMessage._id}`) // inform backend also to mark the message as seen 
            }
            else{
                setUnseenMessages((prevUnseenMessages)=>({
                    ...prevUnseenMessages,[newMessage.senderId] : prevUnseenMessages[newMessage.senderId] ? prevUnseenMessages[newMessage.senderId] + 1 : 1 // add (+1) for each new message , init 1 for first message
                }))
            }

        })
    }

    
    //function to unsubscribe from messages
    const unsubscribeFromMessages = ()=>{
        if(socket) socket.off('newMessage')
    }

//     selectedUser changes
// ↓
// cleanup runs → stop old listener (if not stopped it may lead to duplicate messages)
// ↓
// subscribe again → listen for Karan messages

    useEffect(()=>{
        subscribeToMessages()
        return ()=>{
            unsubscribeFromMessages()
        }
    },[socket,selectedUser])

    const value = {
        messages , users,selectedUser, getUsers, setMessages,getMessages, sendMessage , setSelectedUser , unseenMessages,setUnseenMessages
    }
    return (
        <ChatContext.Provider value = {value}>
            {children}
        </ChatContext.Provider>
    )
}