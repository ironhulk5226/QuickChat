import axios from "axios";
import toast from 'react-hot-toast'
import { io } from "socket.io-client";
import { createContext, useState, useEffect } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({children}) =>{
    const [token,setToken] = useState(localStorage.getItem('token'))
    const [authUser,setAuthUser] = useState(null)
    const [onlineUsers , setOnlineUsers] = useState([])
    const [socket , setSocket] = useState(null);

    // check if user is authenticated and if so , set the user data and connect the socket
    const checkAuth = async()=>{
        try {
            const {data} = await axios.get('api/user/check')
            if(data.success){
                setAuthUser(data.user)
                connectSocket(data.user)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // connect socket function to handle socet connection adn online user updates


    useEffect(()=>{
        if(token){
            axios.defaults.headers.common["token"] = token;
            checkAuth()
        }
    },[token])

    //Login function to handle user authentication and socket connection
    const login = async(state,credentials)=>{ // states : login , signup
        try {
            
            const {data} = await axios.post(`api/user/${state}`,credentials)

            if(data.success){
                setAuthUser(data.user)
                connectSocket(data.user)
                axios.defaults.headers.common['token'] = data.token
                localStorage.setItem('token',data.token)
                setToken(data.token)

                toast.success(data.message)
                return true
            }
            else{ // request accepted but  invalid password
                toast.error(data.message)
                return false
            }
        } catch (error) { // request rejected
            console.log("Login error:", error);
            const errorMsg = error.response?.data?.message || error.message || "An error occurred";
            toast.error(errorMsg)
            return false
        }
    }

    //Logout function -> logout and socket disconnect
    const logout = async()=>{
        localStorage.removeItem('token')
        setToken(null)
        setAuthUser(null)
        setOnlineUsers([])
        delete axios.defaults.headers.common['token'];

        toast.success('Logged out successfully')

        socket?.disconnect()
    }

    // Update profile function to handle user profile updates
    const updateProfile = async(body)=>{
        try {
            const {data} = await axios.put("api/user/update-profile",body)
            if(data.success){
                setAuthUser(data.user);
                toast.success("Profile Updated Successfully")
                return true
            }
            toast.error(data.message)
            return false
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || "An error occurred";
            toast.error(errorMsg)
            return false
        }
    }


    const connectSocket = (userData)=>{
        if(!userData || socket?.connected){ // no data or socket already connected
            return;
        }
        const newSocket = io(backendUrl,{
            query : {
                userId:userData._id
            }
        })

        newSocket.connect();

        setSocket(newSocket)

        newSocket.on("getOnlineUsers",(userIds)=>{
            setOnlineUsers(userIds)
        })

    }

    const value = {
        axios,
        authUser,
        onlineUsers,
        socket,
        login,
        logout,
        updateProfile
    }

    return (
        <AuthContext.Provider value={value}>
            {children}

        </AuthContext.Provider>
    )
}



