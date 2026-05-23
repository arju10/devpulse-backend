import type { Request, Response } from "express";
import type { ParsedQs } from "qs";
import { StatusCodes } from "http-status-codes";
import * as issueService from "./issue.service";
import { sendSuccess, sendError } from "../../utils/response";
import type {
  CreateIssueBody,
  UpdateIssueBody,
  IssueQueryParams,
} from "./issue.interface";

// Helper: safely extract single string from query param
const getString = (
  value: string | ParsedQs | (string | ParsedQs)[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) return value[0] as string | undefined;
  if (typeof value === "object") return undefined;
  return value;
};

// [POST] /api/issues
export const createIssue = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { title, description, type } = req.body as CreateIssueBody;

    if (!title || !description || !type) {
      sendError(
        res,
        StatusCodes.BAD_REQUEST,
        "title, description, and type are required",
      );
      return;
    }
    if (title.length > 150) {
      sendError(
        res,
        StatusCodes.BAD_REQUEST,
        "Title must be 150 characters or less",
      );
      return;
    }
    if (description.length < 20) {
      sendError(
        res,
        StatusCodes.BAD_REQUEST,
        "Description must be at least 20 characters",
      );
      return;
    }
    if (!["bug", "feature_request"].includes(type)) {
      sendError(
        res,
        StatusCodes.BAD_REQUEST,
        "Type must be bug or feature_request",
      );
      return;
    }

    const issue = await issueService.createIssue(
      { title, description, type },
      req.user!.id,
    );
    sendSuccess(res, StatusCodes.CREATED, "Issue created successfully", issue);
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    sendError(
      res,
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error",
    );
  }
};

// [GET] /api/issues
export const getAllIssues = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const query: IssueQueryParams = {
      sort: getString(req.query.sort) as IssueQueryParams["sort"],
      type: getString(req.query.type) as IssueQueryParams["type"],
      status: getString(req.query.status) as IssueQueryParams["status"],
    };

    const issues = await issueService.getAllIssues(query);
    sendSuccess(res, StatusCodes.OK, "Issues retrieved successfully", issues);
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    sendError(
      res,
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error",
    );
  }
};

// [GET] /api/issues/:id
export const getIssueById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const rawId = getString(req.params["id"]);
    const id = parseInt(rawId ?? "", 10);
    if (isNaN(id)) {
      sendError(res, StatusCodes.BAD_REQUEST, "Invalid issue ID");
      return;
    }

    const issue = await issueService.getIssueById(id);
    if (!issue) {
      sendError(res, StatusCodes.NOT_FOUND, "Issue not found");
      return;
    }

    sendSuccess(res, StatusCodes.OK, "Issue retrieved successfully", issue);
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    sendError(
      res,
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error",
    );
  }
};

// [PATCH] /api/issues/:id
export const updateIssue = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const rawId = getString(req.params["id"]);
    const id = parseInt(rawId ?? "", 10);
    if (isNaN(id)) {
      sendError(res, StatusCodes.BAD_REQUEST, "Invalid issue ID");
      return;
    }

    const body = req.body as UpdateIssueBody;
    const issue = await issueService.updateIssue(
      id,
      body,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, StatusCodes.OK, "Issue updated successfully", issue);
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    sendError(
      res,
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error",
    );
  }
};

// [DELETE] /api/issues/:id
export const deleteIssue = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const rawId = getString(req.params["id"]);
    const id = parseInt(rawId ?? "", 10);
    if (isNaN(id)) {
      sendError(res, StatusCodes.BAD_REQUEST, "Invalid issue ID");
      return;
    }

    const deleted = await issueService.deleteIssue(id);
    if (!deleted) {
      sendError(res, StatusCodes.NOT_FOUND, "Issue not found");
      return;
    }

    sendSuccess(res, StatusCodes.OK, "Issue deleted successfully");
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    sendError(
      res,
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error",
    );
  }
};
