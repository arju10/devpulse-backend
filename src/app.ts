import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db";

dotenv.config();

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
// HEre we will add all the routes for our application, for now we have only one route for health check, but in future we will add more routes for user authentication, project management, task management, etc.

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({ success: true, message: "DevPulse API is running" });
});

export default app;
