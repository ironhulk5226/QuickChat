import express from 'express'
import { protectRoute } from '../middleware/Auth.js';
import { getMessages, getUsersForSidebar, markMessageAsSeen, sendMessage } from '../controllers/messageController.js';

const messageRouter = express.Router();

// @api/messages
messageRouter.get('/users',protectRoute,getUsersForSidebar)

messageRouter.get('/:id' , protectRoute , getMessages)

messageRouter.put('mark/:id' , protectRoute , markMessageAsSeen)

messageRouter.post('/send/:id',protectRoute,sendMessage);

export default messageRouter;