import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { sendError } from "../utils/response";
import type { JwtPayload } from "../modules/auth/auth.interface";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const token = req.headers.authorization;

  if (!token) {
    sendError(res, StatusCodes.UNAUTHORIZED, "Authorization token is required");
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    sendError(res, StatusCodes.UNAUTHORIZED, "Invalid or expired token");
  }
};

export const requireMaintainer = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.user?.role !== "maintainer") {
    sendError(
      res,
      StatusCodes.FORBIDDEN,
      "Access restricted to maintainers only",
    );
    return;
  }
  next();
};
