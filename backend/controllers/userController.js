import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

// SignUp user
export const signUp = async (req, res) => {
  const { fullName, email, password, bio } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.json({
        message: "Please fill all the fields",
        success: false,
      });
    }

    const user = await User.findOne({ email });

    if (user) {
      return res.json({ message: "User Already Exists", success: false });
    }

    const salt = await bcrypt.genSalt(10); // A salt is a random string added to the password so that the hash becomes more secure.
    // 10 -> no.of rounds to make hash more complex ; more the rounds more is hash complexity and more time required
    // so 10 is common

    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio,
    });

    const token = generateToken(newUser._id);

    res.json({
      success: true,
      user: newUser,
      token,
      message: "Account created successfully",
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Login
export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email });

    if (!userData) {
      return res.json({
        success: false,
        message: "User not found , please SignUp first!",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);

    if (!isPasswordCorrect) {
      return res.json({ success: false, message: "Invalid password" });
    }

    const token = generateToken(userData._id);
    res.json({ success: true, user: userData, token, message: "Login Successful" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// controller to check if user is authenticated

export const checkAuth = async (req, res) => {
  // will run after auth middleware
  res.json({ success: true, user: req.user });
};

// controller to update user profile details
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;

    const userId = req.user._id;

    let updatedUser;

    if (!profilePic) {
      // when profile picture not provided
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName },
        { new: true },
      ); //By default, MongoDB returns the old document.
      // If you want the updated document, use:- new:true
    } else {
      const upload = await cloudinary.uploader.upload(profilePic);

      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName, profilePic: upload.secure_url },
        { new: true },
      );
    }

    res.json({
      success: true,
      user: updatedUser,
      message: "Profile Updated Successfully!",
    });
  } catch (error) {
     console.log(error.message);
     res.json({ success: false, message: error.message });
  
  }
};
