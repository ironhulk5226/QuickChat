import React, { useState } from 'react'
import assets from '../assets/assets'
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {

  const [currState,setCurrState] = useState('Sign Up');
  const [fullName,setFullName] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [bio,setBio] = useState("");
  const [isDataSubmitted,setIsDataSubmitted] = useState(false);

  const {login} = useContext(AuthContext)
  const navigate = useNavigate()


  const onSubmitHandler = async (e)=>{
    e.preventDefault();

    if(currState === 'Sign Up' && !isDataSubmitted){
      setIsDataSubmitted(true);
      return;
    }

    const isSuccess = await login(currState == 'Sign Up' ? 'signup' : 'login',{fullName,email,password,bio})

    if(isSuccess && currState === 'Sign Up'){
      navigate('/profile')
    }

  }



  return (
    <div className='min-h-screen bg-cover bg-center flex items-center justify-center gap-8 sm:justify-evenly max-sm:flex-col backdrop-blur-2xl  '>
       {/* left */}
       <img src={assets.logo_big} className='w-[min(30vw,250px)]' alt="" />

       {/* right */}
       <form 
       action="" 
       onSubmit={onSubmitHandler}

       className='border-2 bg-white/8 text-white border-gray-500 p-6 flex flex-col gap-6 rounded-lg shadow-lg'>
          <h2 className='font-medium text-2xl flex justify-between items-center'>{currState}

              { isDataSubmitted && <img 
              onClick={()=>setIsDataSubmitted(false)}
              src={assets.arrow_icon} 
              className='w-5 cursor-pointer' alt="" />
              }
          </h2>

          {currState === 'Sign Up' && !isDataSubmitted && (
            <input type="text" placeholder='Full Name' onChange={(e)=>setFullName(e.target.value)} value={fullName} required className='p-2 border border-gray-500 rounded-md focus:outline-none'/>
            )}

            {!isDataSubmitted && (
              <>
                 <input type="email" placeholder='Email Address' onChange={(e)=>setEmail(e.target.value)} value={email} className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ' required/>
                 <input type="password" placeholder='Password' onChange={(e)=>setPassword(e.target.value)} value={password} className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500' required/>
              
              </>
            )}

            {
               currState === 'Sign Up' && isDataSubmitted && (
                 <textarea  
                 onChange={(e)=>setBio(e.target.value)}
                 value={bio}
                 rows={4} className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter your bio..." >

                 </textarea>
               )
            }

            <button type='submit' className='py-3 bg-gradient-to-r from-purple-400 to-violet-600 rounded-md cursor-pointer'> 
               {currState === 'Sign Up' ? "Create Account" : "Login Now"}
            </button>

            <div>
              { 
                currState === 'Sign Up' ? (
                  <p className='text-sm text-gray-600' >
                    Already Have an Account? 
                    <span 
                    onClick={()=>{setCurrState('Login'); setIsDataSubmitted(false)}}
                    className='font-medium text-violet-500 cursor-pointer px-2' >
                       Login
                    </span>
                  </p>

                ) : (
                  <p className='text-sm text-gray-600' >
                    Create a new Account, 
                    <span 
                    onClick={()=>setCurrState('Sign Up')}
                    className='font-medium text-violet-500 cursor-pointer px-2'>
                       SignUp
                    </span>
                  </p>
                )
              }
            </div>


       </form>
    </div>
  )
}

export default LoginPage