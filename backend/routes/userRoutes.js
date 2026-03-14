import express from 'express';
import { checkAuth, Login, signUp, updateProfile } from '../controllers/userController.js';
import { protectRoute } from '../middleware/Auth.js';

const userRouter = express.Router();

// @/api/user/...
userRouter.post('/signup',signUp);

userRouter.post('/login',Login);

userRouter.put('/update-profile',protectRoute,updateProfile);

userRouter.get('/check',protectRoute , checkAuth);

export default userRouter;

