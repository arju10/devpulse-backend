import pool from "../../config/db";
import type {
  CreateIssueBody,
  UpdateIssueBody,
  IssueRecord,
  IssueWithReporter,
  IssueQueryParams,
} from "./issue.interface";

// Helper --> fetch reporter data for a list of issues
const attachReporters = async (
  issues: IssueRecord[],
): Promise<IssueWithReporter[]> => {
  if (issues.length === 0) return [];

  const reporterIds = [...new Set(issues.map((i) => i.reporter_id))];
  const result = await pool.query(
    `SELECT id, name, role FROM users WHERE id = ANY($1::int[])`,
    [reporterIds],
  );

  const reporterMap = new Map(result.rows.map((r) => [r.id, r]));

  return issues.map((issue) => ({
    ...issue,
    reporter: reporterMap.get(issue.reporter_id) || {
      id: issue.reporter_id,
      name: "Unknown",
      role: "contributor",
    },
  }));
};

// [POST] /api/issues
export const createIssue = async (
  body: CreateIssueBody,
  reporterId: number,
): Promise<IssueRecord> => {
  const { title, description, type } = body;

  const result = await pool.query<IssueRecord>(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, description, type, reporterId],
  );

  const issue = result.rows[0];
  if (!issue) {
    throw { statusCode: 500, message: "Failed to create issue" };
  }

  return issue;
};

// [GET] /api/issues
export const getAllIssues = async (
  query: IssueQueryParams,
): Promise<IssueWithReporter[]> => {
  const { sort = "newest", type, status } = query;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (type) {
    conditions.push(`type = $${paramCount++}`);
    values.push(type);
  }
  if (status) {
    conditions.push(`status = $${paramCount++}`);
    values.push(status);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderClause =
    sort === "oldest" ? "ORDER BY created_at ASC" : "ORDER BY created_at DESC";

  const result = await pool.query<IssueRecord>(
    `SELECT * FROM issues ${whereClause} ${orderClause}`,
    values,
  );

  return attachReporters(result.rows);
};

// [GET] /api/issues/:id
export const getIssueById = async (
  id: number,
): Promise<IssueWithReporter | null> => {
  const result = await pool.query<IssueRecord>(
    "SELECT * FROM issues WHERE id = $1",
    [id],
  );

  if (result.rows.length === 0) return null;

  const [issue] = await attachReporters(result.rows);
  if (!issue) return null;

  return issue;
};

// [PATCH] /api/issues/:id
export const updateIssue = async (
  id: number,
  body: UpdateIssueBody,
  requesterId: number,
  requesterRole: string,
): Promise<IssueRecord> => {
  // Fetch existing issue
  const existing = await pool.query<IssueRecord>(
    "SELECT * FROM issues WHERE id = $1",
    [id],
  );

  if (existing.rows.length === 0) {
    throw { statusCode: 404, message: "Issue not found" };
  }

  const issue = existing.rows[0];
  if (!issue) {
    throw { statusCode: 404, message: "Issue not found" };
  }

  // Permission check
  if (requesterRole === "contributor") {
    if (issue.reporter_id !== requesterId) {
      throw {
        statusCode: 403,
        message: "Contributors can only edit their own issues",
      };
    }
    if (issue.status !== "open") {
      throw {
        statusCode: 409,
        message: "Contributors can only edit issues with status: open",
      };
    }
  }

  // Validation
  if (body.title && body.title.length > 150) {
    throw { statusCode: 400, message: "Title must be 150 characters or less" };
  }
  if (body.description && body.description.length < 20) {
    throw {
      statusCode: 400,
      message: "Description must be at least 20 characters",
    };
  }
  if (body.type && !["bug", "feature_request"].includes(body.type)) {
    throw { statusCode: 400, message: "Type must be bug or feature_request" };
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (body.title !== undefined) {
    setClauses.push(`title = $${paramCount++}`);
    values.push(body.title);
  }
  if (body.description !== undefined) {
    setClauses.push(`description = $${paramCount++}`);
    values.push(body.description);
  }
  if (body.type !== undefined) {
    setClauses.push(`type = $${paramCount++}`);
    values.push(body.type);
  }

  if (setClauses.length === 0) {
    throw { statusCode: 400, message: "No fields to update" };
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<IssueRecord>(
    `UPDATE issues SET ${setClauses.join(", ")} WHERE id = $${paramCount} RETURNING *`,
    values,
  );

  const updated = result.rows[0];
  if (!updated) {
    throw { statusCode: 500, message: "Failed to update issue" };
  }

  return updated;
};

// [DELETE] /api/issues/:id
export const deleteIssue = async (id: number): Promise<boolean> => {
  const result = await pool.query(
    "DELETE FROM issues WHERE id = $1 RETURNING id",
    [id],
  );
  return result.rows.length > 0;
};
