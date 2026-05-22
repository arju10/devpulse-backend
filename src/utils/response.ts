import { type Response } from "express";

export const sendSuccess = (
  res: Response,
  statusCode: number,
  message: string,
  data?: unknown,
): Response => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errors?: unknown,
): Response => {
  return res.status(statusCode).json({ success: false, message, errors });
};
