import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes";
import issueRoutes from "./modules/issue/issue.routes";

dotenv.config();

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({ success: true, message: "DevPulse API is running" });
});

export default app;
