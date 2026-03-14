import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import assets from '../assets/assets';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const ProfilePage = () => {
  const {authUser ,updateProfile} = useContext(AuthContext)
  const [selectedImg , setSelectedImg] = useState(authUser?.profilePic || null);
  const navigate = useNavigate();
  const [name,setName] = useState(authUser?.fullName);
  const [bio,setBio] = useState(authUser?.bio);

  const handleSubmit = async (e) =>{
     e.preventDefault();
      if(!selectedImg || typeof selectedImg === 'string'){
        const isUpdated = await updateProfile({fullName:name,bio});
        if(isUpdated) navigate('/');
        return;
     }
     // for image , first we need to convert it into base 64 
    //  Base64 encoding converts an image into a text string so it can be sent inside JSON requests to the backend easily.

    const reader = new FileReader();
    reader.readAsDataURL(selectedImg)
    reader.onload = async()=>{
       const base64Image = reader.result;
       const isUpdated = await updateProfile({profilePic:base64Image,fullName:name,bio});
       if(isUpdated) navigate('/')
    }


  }

  return (
    <div className='min-h-screen bg-cover bg-no-repeat flex items-center justify-center'>
       <div className='w-5/6 max-w-2xl backdrop-blur-2xl text-gray-300 border-2 border-gray-600 flex items-center justify-between max-sm:flex-col-reverse rounded-lg '>
        <form onSubmit={(e)=>handleSubmit(e)} action="" className='flex flex-col gap-5 p-10 flex-1'>
            <h3 className='text-lg' >Profile Details</h3>
            <label htmlFor="avatar" className='flex items-center gap-3 cursor-pointer'>
                <input onChange={(e)=>setSelectedImg(e.target.files[0])} type="file" id='avatar' accept='image/*'  hidden/>
                <div className='relative'>
                  <img src={selectedImg ? (typeof selectedImg === 'string' ? selectedImg : URL.createObjectURL(selectedImg)) : assets.avatar_icon} alt="" className={`w-12 h-12 ${selectedImg && 'rounded-full'}`} />
                  {selectedImg && (
                    <span 
                      onClick={(e) => {e.preventDefault(); setSelectedImg(null)}} // preventing default event behaviour due to file tag.
                      className='absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex justify-center items-center text-xs cursor-pointer hover:bg-red-600'>
                      ×
                    </span>
                  )}
                </div>
                Upload Profile Image
            </label>
            <input type="text" onChange={(e)=>setName(e.target.value)} value={name}  placeholder='Enter Your Name'
            className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500'
             required/>
             <textarea onChange={(e)=>setBio(e.target.value)} value={bio} placeholder='Write a Profile Bio' className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500' rows={4} required></textarea>

             <button 
             type='submit' 
             className='bg-gradient-to-r from-purple-400 to-violet-600 rounded-full text-lg cursor-pointer'>
                Save
             </button>
            
        </form>
        <img src={authUser?.profilePic||assets.logo_icon} className={`max-w-44 aspect-square rounded-full mx-10 max-sm:mt-10 ${selectedImg && 'rounded-full'}`} alt="" />
        
       </div>
    </div>
  )
}

export default ProfilePage