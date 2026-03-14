# QuickChat 💬

A full-stack real-time messaging web application with one-on-one chat, live online status, and image sharing.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [WebSocket Flow](#websocket-flow)
- [Authentication Flow](#authentication-flow)
- [REST API Endpoints](#rest-api-endpoints)
- [Setup and Installation](#setup-and-installation)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)

---

## Features

- **Real-time messaging** — Messages are delivered instantly via Socket.io without page refreshes.
- **Online presence** — See which users are currently online in the sidebar.
- **Unread message badges** — Conversations with unread messages show a count badge.
- **Seen/unseen tracking** — Messages are marked as seen when the recipient opens the conversation.
- **Image sharing** — Send images in chat; they are stored via Cloudinary.
- **Profile management** — Users can update their display name, bio, and profile picture.
- **JWT authentication** — Secure token-based auth with protected routes.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS 4 |
| Backend | Node.js, Express 5 |
| Real-time | Socket.io 4.8.3 |
| Database | MongoDB (Mongoose 9) |
| Authentication | JSON Web Tokens (JWT) |
| Image Storage | Cloudinary |
| HTTP Client | Axios |
| State Management | React Context API |

---

## Project Structure

```
QuickChat/
├── backend/
│   ├── controllers/
│   │   ├── messageController.js   # Send/get messages, mark seen
│   │   └── userController.js      # Sign up, login, check auth, update profile
│   ├── middleware/
│   │   └── Auth.js                # JWT verification middleware
│   ├── models/
│   │   ├── Message.js             # Message schema (senderId, receiverId, text, image, seen)
│   │   └── User.js                # User schema (email, password, fullName, bio, profilePic)
│   ├── routes/
│   │   ├── messageRoutes.js       # /api/messages/* routes
│   │   └── userRoutes.js          # /api/user/* routes
│   ├── lib/
│   │   ├── cloudinary.js          # Cloudinary configuration
│   │   ├── db.js                  # MongoDB connection
│   │   └── utils.js               # JWT token generation helper
│   ├── server.js                  # Express app, Socket.io server, route mounting
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── HomePage.jsx       # Main 3-column layout (Sidebar + Chat + RightSidebar)
    │   │   ├── LoginPage.jsx      # Sign up / login form
    │   │   └── ProfilePage.jsx    # Profile edit page
    │   ├── components/
    │   │   ├── ChatContainer.jsx  # Message list, text input, image send
    │   │   ├── RightSidebar.jsx   # Selected user info and media gallery
    │   │   └── Sidebar.jsx        # User list with search, online dots, unread badges
    │   ├── context/
    │   │   ├── AuthContext.jsx    # Auth state, socket connection lifecycle
    │   │   └── ChatContext.jsx    # Chat state, message subscription
    │   ├── lib/
    │   │   └── utils.js           # formatMessageTime helper
    │   ├── App.jsx                # Route definitions (protected routes)
    │   └── main.jsx               # Entry point, wraps app with context providers
    ├── .env                       # Frontend env vars (VITE_BACKEND_URL)
    └── package.json
```

---

## WebSocket Flow

QuickChat uses **Socket.io** for all real-time features. Below is a detailed walkthrough of how the WebSocket layer works.

### How the Server Tracks Connected Users

The server keeps an in-memory map of which users are currently connected:

```
userSocketMap = {
  "<userId>": "<socketId>",
  ...
}
```

This map is the backbone of targeted message delivery — it lets the server look up the socket ID for any online user and push a message directly to them.

---

### 1. Connection Setup

**Client side (`AuthContext.jsx`):**

When a user logs in or is verified as authenticated, `connectSocket()` is called. It opens a Socket.io connection and passes the user's ID as a query parameter so the server knows who is connecting.

```js
const newSocket = io(backendUrl, {
  query: { userId: userData._id }
});
newSocket.connect();
setSocket(newSocket);

// Listen for online users updates broadcast by the server
newSocket.on("getOnlineUsers", (userIds) => {
  setOnlineUsers(userIds);
});
```

**Server side (`server.js`):**

When a client connects, the server extracts the user ID from the query string, records the mapping, and broadcasts the updated online user list to every connected client.

```js
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  // Broadcast updated list to ALL clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    delete userSocketMap[userId];
    // Broadcast again so everyone knows this user went offline
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});
```

---

### 2. Sending a Message

Sending a message is a **hybrid HTTP + WebSocket** operation:

1. The sender makes an HTTP `POST` to `/api/messages/send/:receiverId`.
2. The backend saves the message to MongoDB.
3. The backend looks up the receiver's socket ID in `userSocketMap`.
4. If the receiver is online, the backend emits a `newMessage` event **directly to that socket only** (not a broadcast).
5. The HTTP response returns the saved message to the sender, who optimistically adds it to the UI.

```
Sender (Client A)
    │
    │  POST /api/messages/send/:receiverId  (HTTP)
    ▼
Backend
    ├── Save message to MongoDB
    ├── Upload image to Cloudinary (if any)
    ├── Look up receiverSocketId = userSocketMap[receiverId]
    └── io.to(receiverSocketId).emit("newMessage", message)  (Socket.io)
                                        │
                                        ▼
                                Receiver (Client B)
                                    socket.on("newMessage", ...)
```

**Backend (`messageController.js`):**

```js
export const sendMessage = async (req, res) => {
  const { text, image } = req.body;
  const receiverId = req.params.id;
  const senderId = req.user._id;

  let imageUrl;
  if (image) {
    const upload = await cloudinary.uploader.upload(image);
    imageUrl = upload.secure_url;
  }

  const newMessage = await Message.create({
    senderId,
    receiverId,
    text,
    image: imageUrl,
  });

  // Only emit if receiver is currently connected
  const receiverSocketId = userSocketMap[receiverId];
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", newMessage);
  }

  res.json({ success: true, message: newMessage });
};
```

---

### 3. Receiving a Message

**Client side (`ChatContext.jsx`):**

Every time the selected conversation changes, the client subscribes to the `newMessage` event. When a message arrives, there are two cases:

- **The conversation with the sender is open** → the message is appended to the chat and immediately marked as seen on the backend.
- **A different conversation is open** → only the unread badge counter for that sender is incremented.

```js
socket.on("newMessage", (newMessage) => {
  if (selectedUser && newMessage.senderId === selectedUser._id) {
    // User is currently viewing this conversation
    newMessage.seen = true;
    setMessages((prev) => [...prev, newMessage]);
    axios.put(`api/messages/mark/${newMessage._id}`); // persist seen flag
  } else {
    // Different conversation is open — increment unread badge
    setUnseenMessages((prev) => ({
      ...prev,
      [newMessage.senderId]: (prev[newMessage.senderId] ?? 0) + 1,
    }));
  }
});
```

The subscription is cleaned up whenever the selected user changes to avoid duplicate listeners:

```js
useEffect(() => {
  subscribeToMessages();
  return () => unsubscribeFromMessages(); // socket.off("newMessage")
}, [socket, selectedUser]);
```

---

### 4. Disconnection

When the browser tab is closed or the user navigates away, Socket.io fires `disconnect` on the server. The server removes the user from `userSocketMap` and re-broadcasts the online list so every other client's sidebar immediately reflects the change.

---

### WebSocket Events Reference

| Event | Direction | Triggered When | Payload |
|-------|-----------|----------------|---------|
| `connection` | Client → Server | User opens the app after login | `socket.handshake.query.userId` |
| `getOnlineUsers` | Server → All Clients | User connects or disconnects | `string[]` — array of online user IDs |
| `newMessage` | Server → Receiver only | A message is sent | `Message` object |
| `disconnect` | Client → Server | Browser tab closed / network lost | _(none)_ |

---

### Socket.io Methods Used

```js
// Server
io.on("connection", (socket) => { ... })      // Listen for new connections
io.emit("event", data)                         // Broadcast to ALL connected clients
io.to(socketId).emit("event", data)            // Send to ONE specific client
socket.on("disconnect", () => { ... })         // Handle disconnection

// Client
socket.on("event", (data) => { ... })          // Listen for server events
socket.off("event")                            // Remove listener
socket.connect()                               // Open connection
socket.disconnect()                            // Close connection
```

---

## Authentication Flow

### Sign Up

```
1. User submits: email, password, fullName, bio
2. POST /api/user/signup
3. Server checks email uniqueness
4. Password is hashed with bcrypt (10 rounds)
5. User document created in MongoDB
6. JWT token generated (payload: { userId })
7. Response: { user, token }
8. Client stores token in localStorage
9. Axios default header set: token: <token>
10. Socket.io connection opened with userId
```

### Login

```
1. User submits: email, password
2. POST /api/user/login
3. Server finds user by email
4. bcrypt.compare(password, hashedPassword)
5. JWT token generated
6. Response: { user, token }
7. Same client-side steps as sign up (steps 8–10 above)
```

### Protected Routes

Every protected API request must include the JWT in the `token` header. The `Auth.js` middleware verifies it and attaches the decoded user to `req.user`.

On the frontend, React Router guards the `HomePage` and `ProfilePage` — unauthenticated users are redirected to `LoginPage`.

---

## REST API Endpoints

### User Routes (`/api/user`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/signup` | ❌ | Create a new account |
| `POST` | `/login` | ❌ | Log in and receive a token |
| `PUT` | `/update-profile` | ✅ | Update fullName, bio, profilePic |
| `GET` | `/check` | ✅ | Verify token and return user data |

### Message Routes (`/api/messages`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users` | ✅ | Get all users for the sidebar (with unread counts) |
| `GET` | `/:id` | ✅ | Get message history with a specific user |
| `POST` | `/send/:id` | ✅ | Send a message (text and/or image) to a user |
| `PUT` | `/mark/:id` | ✅ | Mark a specific message as seen |

---

## Setup and Installation

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- **MongoDB** — a running local instance or a MongoDB Atlas connection string
- **Cloudinary account** — required for profile picture and image message uploads

### 1. Clone the Repository

```bash
git clone https://github.com/ironhulk5226/QuickChat.git
cd QuickChat
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## Environment Variables

### Backend (`backend/.env`)

Create a `.env` file inside the `backend/` directory:

```env
PORT=1000
MONGODB_URI=mongodb://localhost:27017/
JWT_SECRET=your_super_secret_key_here

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

| Variable | Description |
|----------|-------------|
| `PORT` | Port the Express server listens on (default `1000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign and verify JWT tokens |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

### Frontend (`frontend/.env`)

A `.env` file is already present in the `frontend/` directory:

```env
VITE_BACKEND_URL=http://localhost:1000
```

Update the URL if your backend runs on a different host or port.

---

## Running the App

### Development

Open two terminal windows:

**Terminal 1 — Backend:**
```bash
cd backend
npm start
# Server starts on http://localhost:1000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Dev server starts on http://localhost:5173
```

Then open `http://localhost:5173` in your browser.

### Production Build

```bash
# Build the frontend
cd frontend
npm run build
# Output is in frontend/dist/
```

The backend serves only the API; deploy `frontend/dist/` to any static host (Vercel, Netlify, etc.) and point `VITE_BACKEND_URL` at your deployed backend.

### Usage

1. Navigate to the app and **sign up** with your email, password, name, and bio.
2. Optionally update your **profile picture** on the Profile page.
3. Select any user from the **sidebar** to open a one-on-one conversation.
4. Send **text messages** or **images** in real time.
5. Online users are indicated by a **green dot** in the sidebar.
6. Unread messages show a **badge counter** next to the contact name.
