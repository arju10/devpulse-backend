

   import { createRequire } from 'module';

   const require = createRequire(import.meta.url);

  

// src/server.ts
import dotenv3 from "dotenv";

// src/app.ts
import express from "express";
import cors from "cors";
import dotenv2 from "dotenv";

// src/modules/auth/auth.routes.ts
import { Router } from "express";

// src/modules/auth/auth.controller.ts
import { StatusCodes } from "http-status-codes";

// src/config/db.ts
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Database connected Successfully");
  }
});
var db_default = pool;

// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
var SALT_ROUNDS = 10;
var registerUser = async (body) => {
  const { name, email, password, role } = body;
  const existing = await db_default.query("SELECT id FROM users WHERE email = $1", [
    email
  ]);
  if (existing.rows.length > 0) {
    throw { statusCode: 400, message: "Email already registered" };
  }
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await db_default.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at, updated_at`,
    [name, email, hashed, role]
  );
  const newUser = result.rows[0];
  if (!newUser) {
    throw { statusCode: 500, message: "Failed to create user" };
  }
  return newUser;
};
var loginUser = async (body) => {
  const { email, password } = body;
  const result = await db_default.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  if (result.rows.length === 0) {
    throw { statusCode: 401, message: "Invalid email or password" };
  }
  const user = result.rows[0];
  if (!user) {
    throw { statusCode: 401, message: "Invalid email or password" };
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw { statusCode: 401, message: "Invalid email or password" };
  }
  const payload = { id: user.id, name: user.name, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
  const { password: _pw, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};

// src/utils/response.ts
import "express";
var sendSuccess = (res, statusCode, message, data) => {
  return res.status(statusCode).json({ success: true, message, data });
};
var sendError = (res, statusCode, message, errors) => {
  return res.status(statusCode).json({ success: false, message, errors });
};

// src/modules/auth/auth.controller.ts
var signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      sendError(
        res,
        StatusCodes.BAD_REQUEST,
        "name, email, and password are required"
      );
      return;
    }
    if (role && !["contributor", "maintainer"].includes(role)) {
      sendError(
        res,
        StatusCodes.BAD_REQUEST,
        "role must be contributor or maintainer"
      );
      return;
    }
    const user = await registerUser({
      name,
      email,
      password,
      role: role || "contributor"
    });
    sendSuccess(res, StatusCodes.CREATED, "User registered successfully", user);
  } catch (err) {
    const error = err;
    sendError(
      res,
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error"
    );
  }
};
var login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      sendError(
        res,
        StatusCodes.BAD_REQUEST,
        "email and password are required"
      );
      return;
    }
    const data = await loginUser({ email, password });
    sendSuccess(res, StatusCodes.OK, "Login successful", data);
  } catch (err) {
    const error = err;
    sendError(
      res,
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error"
    );
  }
};

// src/modules/auth/auth.routes.ts
var router = Router();
router.post("/signup", signup);
router.post("/login", login);
var auth_routes_default = router;

// src/modules/issue/issue.routes.ts
import { Router as Router2 } from "express";

// src/middleware/auth.middleware.ts
import jwt2 from "jsonwebtoken";
import { StatusCodes as StatusCodes2 } from "http-status-codes";
var authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    sendError(res, StatusCodes2.UNAUTHORIZED, "Authorization token is required");
    return;
  }
  try {
    const decoded = jwt2.verify(
      token,
      process.env.JWT_SECRET
    );
    req.user = decoded;
    next();
  } catch {
    sendError(res, StatusCodes2.UNAUTHORIZED, "Invalid or expired token");
  }
};
var requireMaintainer = (req, res, next) => {
  if (req.user?.role !== "maintainer") {
    sendError(
      res,
      StatusCodes2.FORBIDDEN,
      "Access restricted to maintainers only"
    );
    return;
  }
  next();
};

// src/modules/issue/issue.controller.ts
import { StatusCodes as StatusCodes3 } from "http-status-codes";

// src/modules/issue/issue.service.ts
var attachReporters = async (issues) => {
  if (issues.length === 0) return [];
  const reporterIds = [...new Set(issues.map((i) => i.reporter_id))];
  const result = await db_default.query(
    `SELECT id, name, role FROM users WHERE id = ANY($1::int[])`,
    [reporterIds]
  );
  const reporterMap = new Map(result.rows.map((r) => [r.id, r]));
  return issues.map((issue) => ({
    ...issue,
    reporter: reporterMap.get(issue.reporter_id) || {
      id: issue.reporter_id,
      name: "Unknown",
      role: "contributor"
    }
  }));
};
var createIssue = async (body, reporterId) => {
  const { title, description, type } = body;
  const result = await db_default.query(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, description, type, reporterId]
  );
  const issue = result.rows[0];
  if (!issue) {
    throw { statusCode: 500, message: "Failed to create issue" };
  }
  return issue;
};
var getAllIssues = async (query) => {
  const { sort = "newest", type, status } = query;
  const conditions = [];
  const values = [];
  let paramCount = 1;
  if (type) {
    conditions.push(`type = $${paramCount++}`);
    values.push(type);
  }
  if (status) {
    conditions.push(`status = $${paramCount++}`);
    values.push(status);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderClause = sort === "oldest" ? "ORDER BY created_at ASC" : "ORDER BY created_at DESC";
  const result = await db_default.query(
    `SELECT * FROM issues ${whereClause} ${orderClause}`,
    values
  );
  return attachReporters(result.rows);
};
var getIssueById = async (id) => {
  const result = await db_default.query(
    "SELECT * FROM issues WHERE id = $1",
    [id]
  );
  if (result.rows.length === 0) return null;
  const [issue] = await attachReporters(result.rows);
  if (!issue) return null;
  return issue;
};
var updateIssue = async (id, body, requesterId, requesterRole) => {
  const existing = await db_default.query(
    "SELECT * FROM issues WHERE id = $1",
    [id]
  );
  if (existing.rows.length === 0) {
    throw { statusCode: 404, message: "Issue not found" };
  }
  const issue = existing.rows[0];
  if (!issue) {
    throw { statusCode: 404, message: "Issue not found" };
  }
  if (requesterRole === "contributor") {
    if (issue.reporter_id !== requesterId) {
      throw {
        statusCode: 403,
        message: "Contributors can only edit their own issues"
      };
    }
    if (issue.status !== "open") {
      throw {
        statusCode: 409,
        message: "Contributors can only edit issues with status: open"
      };
    }
  }
  if (body.title && body.title.length > 150) {
    throw { statusCode: 400, message: "Title must be 150 characters or less" };
  }
  if (body.description && body.description.length < 20) {
    throw {
      statusCode: 400,
      message: "Description must be at least 20 characters"
    };
  }
  if (body.type && !["bug", "feature_request"].includes(body.type)) {
    throw { statusCode: 400, message: "Type must be bug or feature_request" };
  }
  const setClauses = [];
  const values = [];
  let paramCount = 1;
  if (body.title !== void 0) {
    setClauses.push(`title = $${paramCount++}`);
    values.push(body.title);
  }
  if (body.description !== void 0) {
    setClauses.push(`description = $${paramCount++}`);
    values.push(body.description);
  }
  if (body.type !== void 0) {
    setClauses.push(`type = $${paramCount++}`);
    values.push(body.type);
  }
  if (setClauses.length === 0) {
    throw { statusCode: 400, message: "No fields to update" };
  }
  setClauses.push(`updated_at = NOW()`);
  values.push(id);
  const result = await db_default.query(
    `UPDATE issues SET ${setClauses.join(", ")} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  const updated = result.rows[0];
  if (!updated) {
    throw { statusCode: 500, message: "Failed to update issue" };
  }
  return updated;
};
var deleteIssue = async (id) => {
  const result = await db_default.query(
    "DELETE FROM issues WHERE id = $1 RETURNING id",
    [id]
  );
  return result.rows.length > 0;
};

// src/modules/issue/issue.controller.ts
var getString = (value) => {
  if (Array.isArray(value)) return value[0];
  if (typeof value === "object") return void 0;
  return value;
};
var createIssue2 = async (req, res) => {
  try {
    const { title, description, type } = req.body;
    if (!title || !description || !type) {
      sendError(
        res,
        StatusCodes3.BAD_REQUEST,
        "title, description, and type are required"
      );
      return;
    }
    if (title.length > 150) {
      sendError(
        res,
        StatusCodes3.BAD_REQUEST,
        "Title must be 150 characters or less"
      );
      return;
    }
    if (description.length < 20) {
      sendError(
        res,
        StatusCodes3.BAD_REQUEST,
        "Description must be at least 20 characters"
      );
      return;
    }
    if (!["bug", "feature_request"].includes(type)) {
      sendError(
        res,
        StatusCodes3.BAD_REQUEST,
        "Type must be bug or feature_request"
      );
      return;
    }
    const issue = await createIssue(
      { title, description, type },
      req.user.id
    );
    sendSuccess(res, StatusCodes3.CREATED, "Issue created successfully", issue);
  } catch (err) {
    const error = err;
    sendError(
      res,
      error.statusCode || StatusCodes3.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error"
    );
  }
};
var getAllIssues2 = async (req, res) => {
  try {
    const query = {
      sort: getString(req.query.sort),
      type: getString(req.query.type),
      status: getString(req.query.status)
    };
    const issues = await getAllIssues(query);
    sendSuccess(res, StatusCodes3.OK, "Issues retrieved successfully", issues);
  } catch (err) {
    const error = err;
    sendError(
      res,
      error.statusCode || StatusCodes3.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error"
    );
  }
};
var getIssueById2 = async (req, res) => {
  try {
    const rawId = getString(req.params["id"]);
    const id = parseInt(rawId ?? "", 10);
    if (isNaN(id)) {
      sendError(res, StatusCodes3.BAD_REQUEST, "Invalid issue ID");
      return;
    }
    const issue = await getIssueById(id);
    if (!issue) {
      sendError(res, StatusCodes3.NOT_FOUND, "Issue not found");
      return;
    }
    sendSuccess(res, StatusCodes3.OK, "Issue retrieved successfully", issue);
  } catch (err) {
    const error = err;
    sendError(
      res,
      error.statusCode || StatusCodes3.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error"
    );
  }
};
var updateIssue2 = async (req, res) => {
  try {
    const rawId = getString(req.params["id"]);
    const id = parseInt(rawId ?? "", 10);
    if (isNaN(id)) {
      sendError(res, StatusCodes3.BAD_REQUEST, "Invalid issue ID");
      return;
    }
    const body = req.body;
    const issue = await updateIssue(
      id,
      body,
      req.user.id,
      req.user.role
    );
    sendSuccess(res, StatusCodes3.OK, "Issue updated successfully", issue);
  } catch (err) {
    const error = err;
    sendError(
      res,
      error.statusCode || StatusCodes3.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error"
    );
  }
};
var deleteIssue2 = async (req, res) => {
  try {
    const rawId = getString(req.params["id"]);
    const id = parseInt(rawId ?? "", 10);
    if (isNaN(id)) {
      sendError(res, StatusCodes3.BAD_REQUEST, "Invalid issue ID");
      return;
    }
    const deleted = await deleteIssue(id);
    if (!deleted) {
      sendError(res, StatusCodes3.NOT_FOUND, "Issue not found");
      return;
    }
    sendSuccess(res, StatusCodes3.OK, "Issue deleted successfully");
  } catch (err) {
    const error = err;
    sendError(
      res,
      error.statusCode || StatusCodes3.INTERNAL_SERVER_ERROR,
      error.message || "Internal server error"
    );
  }
};

// src/modules/issue/issue.routes.ts
var router2 = Router2();
router2.post("/", authenticate, createIssue2);
router2.get("/", getAllIssues2);
router2.get("/:id", getIssueById2);
router2.patch("/:id", authenticate, updateIssue2);
router2.delete("/:id", authenticate, requireMaintainer, deleteIssue2);
var issue_routes_default = router2;

// src/app.ts
dotenv2.config();
var app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", auth_routes_default);
app.use("/api/issues", issue_routes_default);
app.get("/", (req, res) => {
  res.json({ success: true, message: "DevPulse API is running" });
});
var app_default = app;

// src/server.ts
dotenv3.config();
var PORT = process.env.PORT || 5e3;
app_default.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map