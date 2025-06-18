import { myEnvironment } from "../config/env.js";
import { db } from "../database/db.js";
import { UserRole } from "../generated/prisma/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { authHelper } from "../utils/tokenGenerateAndVerify.js";
import { sendMail } from "../libs/sendMail.lib.js";
import { getLevelAndTier } from "../controllers/executeCode.controller.js";

// Register the user
export const register = asyncHandler(async (req, res) => {
  const { username, email, password, name } = req.body;

  // validate required filed
  if (!password || !email || !name || !username) {
    throw new ApiError(400, "Pls provide all filed");
  }

  // check existence
  const existingUser = await db.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    if (existingUser.isVerified) {
      throw new ApiError(409, "User already exist");
    } else {
      const hashedPassword = await authHelper.signHash(password);

      const otp = String(Math.floor(100000 + Math.random() * 900000));

      const token = authHelper.signToken({ email }, myEnvironment.JWT_SECRET, {
        expiresIn: "1h",
      });

      const newUser = await db.user.update({
        where: { id: existingUser.id },
        data: {
          email,
          username,
          password: hashedPassword,
          name: name,
          role: UserRole.USER,
          localPassword: true,
          otp,
          token,
          xp: 0,
          tier: "Bronze",
          level: 1, // Set initial level
        },
      });

      if (!newUser) {
        throw new ApiError(500, "while registering the user have some problem");
      }

      await sendMail({
        email,
        subject: "Activate your account",
        template: "activation.mail.ejs",
        data: {
          name,
          otp,
        },
      });

      res.cookie("verifyToken", token, {
        httpOnly: true,
        secure: myEnvironment.NODE_ENV === "production",
        sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60,
      });

      res
        .status(201)
        .json(
          new ApiResponse(201, {}, "User register successfully verify yourself")
        );
    }
  } else {
    const hashedPassword = await authHelper.signHash(password);

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    const token = authHelper.signToken({ email }, myEnvironment.JWT_SECRET, {
      expiresIn: "1h",
    });

    const newUser = await db.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name: name,
        role: UserRole.USER,
        localPassword: true,
        otp,
        token,
        xp: 0,
        tier: "Bronze",
        level: 1, // Set initial level
      },
    });

    if (!newUser) {
      throw new ApiError(500, "while registering the user have some problem");
    }

    await sendMail({
      email,
      subject: "Activate your account",
      template: "activation.mail.ejs",
      data: {
        name,
        otp,
      },
    });

    res.cookie("verifyToken", token, {
      httpOnly: true,
      secure: myEnvironment.NODE_ENV === "production",
      sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60,
    });

    res
      .status(201)
      .json(
        new ApiResponse(201, {}, "User register successfully verify yourself")
      );
  }
});

// Verify the user
export const verifyAccount = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  const token =
    req.headers.authorization?.split(" ")[1] || req.cookies?.verifyToken;

  if (!otp || !token) {
    throw new ApiError(400, "Please provide all filed");
  }

  const decoded = authHelper.verifyToken(token, myEnvironment.JWT_SECRET);

  if (!decoded) {
    throw new ApiError(401, "unauthorized | token not found");
  }

  const user = await db.user.findUnique({
    where: {
      email: decoded.email,
    },
  });

  if (!user) {
    throw new ApiError(401, "Invalid token");
  }

  if (user.isVerified === true) {
    throw new ApiError(409, "Already verified user");
  }

  if (user.otp !== otp) {
    throw new ApiError(400, "Invalid otp");
  }

  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      isVerified: true,
      otp: "",
      token: "",
    },
  });

  res.status(201).json(new ApiResponse(201, {}, "User verified successfully"));
});

// Login the user
export const login = asyncHandler(async (req, res) => {
  const { data, password } = req.body;

  if (!data || !password) {
    throw new ApiError(400, "All filed are required");
  }

  const isEmail = data.includes("@");

  const user = await db.user.findUnique({
    where: isEmail ? { email: data } : { username: data },
  });

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  const isPasswordValid = await authHelper.verifyHash(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const access_token = authHelper.signToken(
    { id: user.id },
    myEnvironment.ACCESS_SECRET,
    {
      expiresIn: "3d",
    }
  );
  const refresh_token = authHelper.signToken(
    { id: user.id },
    myEnvironment.REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );

  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      token: refresh_token,
    },
  });

  res.cookie("access_token", access_token, {
    httpOnly: true,
    secure: myEnvironment.NODE_ENV === "production",
    // sameSite: "none", : this work on only production
    sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 3 * 24 * 60 * 60 * 1000,
  });

  res.cookie("refresh_token", refresh_token, {
    httpOnly: true,
    secure: myEnvironment.NODE_ENV === "production",
    sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      "User logged in successfully"
    )
  );
});

//forgot password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Missing email ple provided");
  }

  const user = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not exist pls create new account");
  }

  const token = authHelper.signToken(
    { id: user.id },
    myEnvironment.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  await sendMail({
    email,
    subject: "Activate your account",
    template: "forgot.mail.ejs",
    data: {
      name: user.name,
      Link: `${myEnvironment.FRONTEND_URL}${token}`,
    },
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, {}, "Otp send in your email pls check your mail box")
    );
});

//Reset password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new ApiError(404, "Pls provide all filed");
  }

  const decoded = authHelper.verifyToken(token, myEnvironment.JWT_SECRET);

  if (!decoded) {
    throw new ApiError(401, "unauthorized | token not found");
  }

  const user = await db.user.findUnique({
    where: {
      id: decoded.id,
    },
  });

  if (!user) {
    throw new ApiError(401, "Invalid token");
  }

  const hashedPassword = await authHelper.signHash(password);

  const newUser = await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      localPassword: true,
      isVerified: true,
      otp: "",
      token: "",
      password: hashedPassword,
    },
  });

  if (!newUser) {
    throw new ApiError(
      500,
      "Something went wrong while update the password pls try after some time"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        newUser,
        "Password update successfully pls login now"
      )
    );
});

// logout
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: myEnvironment.NODE_ENV === "production",
    sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
  });
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: myEnvironment.NODE_ENV === "production",
    sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
  });
  await db.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      token: "",
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, {}, "User logged out successfully"));
});

// refresh token
export const refreshToken = asyncHandler(async (req, res) => {
  const refresh_token =
    req.headers.authorization?.split(" ")[1] || req.cookies?.refresh_token;

  if (!refreshToken) {
    throw new ApiError(404, "User not found");
  }

  const decoded = authHelper.verifyToken(
    refresh_token,
    myEnvironment.REFRESH_SECRET
  );

  if (!decoded) {
    throw new ApiError(400, "Bad request");
  }

  const user = await db.user.findUnique({
    where: {
      id: decoded.id,
    },
  });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const access_token = authHelper.signToken(
    { id: user.id },
    myEnvironment.ACCESS_SECRET,
    {
      expiresIn: "3d",
    }
  );
  const new_refresh_token = authHelper.signToken(
    { id: user.id },
    myEnvironment.REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );

  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      token: new_refresh_token,
    },
  });

  res.cookie("access_token", access_token, {
    httpOnly: true,
    secure: myEnvironment.NODE_ENV === "production",
    sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 3 * 24 * 60 * 60 * 1000,
  });

  res.cookie("refresh_token", new_refresh_token, {
    httpOnly: true,
    secure: myEnvironment.NODE_ENV === "production",
    sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "access token generated"));
});

// social auth
export const socialAuth = asyncHandler(async (req, res) => {
  const { email, name, avatar } = req.body;

  if (!email || !name) {
    throw new ApiError(404, "Pls provide the all filed");
  }

  const user = await db.user.findUnique({
    where: {
      email,
    },
  });
  // console.log(user)

  if (!user || user.isVerified === false) {
    // console.log("helle")
    // created new user
    const newUser = await db.user.create({
      data: {
        email,
        name,
        image: avatar || "",
        isVerified: true,
        localPassword: false,
        role: UserRole.USER,
        username: email.split("@")[0],
      },
    });

    // console.log("hello")
    const access_token = authHelper.signToken(
      { id: newUser.id },
      myEnvironment.ACCESS_SECRET,
      {
        expiresIn: "3d",
      }
    );
    const refresh_token = authHelper.signToken(
      { id: newUser.id },
      myEnvironment.REFRESH_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // console.log(newUser);
    await db.user.update({
      where: {
        id: newUser.id,
      },
      data: {
        token: refresh_token,
      },
    });

    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: myEnvironment.NODE_ENV === "production",
      sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: myEnvironment.NODE_ENV === "production",
      sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        "User logged in successfully"
      )
    );
  } else {
    // console.log("else")
    const access_token = authHelper.signToken(
      { id: user.id },
      myEnvironment.ACCESS_SECRET,
      {
        expiresIn: "3d",
      }
    );
    const refresh_token = authHelper.signToken(
      { id: user.id },
      myEnvironment.REFRESH_SECRET,
      {
        expiresIn: "7d",
      }
    );

    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        token: refresh_token,
      },
    });

    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: myEnvironment.NODE_ENV === "production",
      sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: myEnvironment.NODE_ENV === "production",
      sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        "User logged in successfully"
      )
    );
  }
});

// get me
export const check = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Fetch the latest user data from the database
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Calculate level and tier
  if (user.xp) {
    const totalXP = parseInt(user.xp || "0");
    const { level, tier } = getLevelAndTier(totalXP);
    // Update user with calculated level and tier
    await db.user.update({
      where: { id: userId },
      data: { level, tier },
    });

    // Update the user object for the response
    user.level = level;
    user.tier = tier;
  }

  // Remove sensitive information
  delete user.password;
  delete user.otp;

  res.status(200).json(new ApiResponse(200, user, "User is authenticated"));
});
