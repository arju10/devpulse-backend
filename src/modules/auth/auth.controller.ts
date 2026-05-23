import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import * as authService from "./auth.service";
import { sendSuccess, sendError } from "../../utils/response";
import type { RegisterBody, LoginBody } from "./auth.interface";

// [POST] -> /api/auth/signup
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body as RegisterBody;

    if (!name || !email || !password) {
      sendError(
        res,
        StatusCodes.BAD_REQUEST,
        "name, email, and password are required",
      );
      return;
    }

    if (role && !["contributor", "maintainer"].includes(role)) {
      sendError(
        res,
        StatusCodes.BAD_REQUEST,
        "role must be contributor or maintainer",
      );
      return;
    }

    const user = await authService.registerUser({
      name,
      email,
      password,
      role: role || "contributor",
    });
    sendSuccess(res, StatusCodes.CREATED, "User registered successfully", user);
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    sendError(
      res,
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error",
    );
  }
};

// [POST] -> /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginBody;

    if (!email || !password) {
      sendError(
        res,
        StatusCodes.BAD_REQUEST,
        "email and password are required",
      );
      return;
    }

    const data = await authService.loginUser({ email, password });
    sendSuccess(res, StatusCodes.OK, "Login successful", data);
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    sendError(
      res,
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error",
    );
  }
};
