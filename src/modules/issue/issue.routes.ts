import { Router } from "express";
import {
  authenticate,
  requireMaintainer,
} from "../../middleware/auth.middleware";
import {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
} from "./issue.controller";

const router = Router();

router.post("/", authenticate, createIssue); // contributor + maintainer
router.get("/", getAllIssues); // public
router.get("/:id", getIssueById); // public
router.patch("/:id", authenticate, updateIssue); // contributor (own+open) or maintainer
router.delete("/:id", authenticate, requireMaintainer, deleteIssue); // maintainer only

export default router;
