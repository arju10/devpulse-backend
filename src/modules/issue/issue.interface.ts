export interface CreateIssueBody {
  title: string;
  description: string;
  type: "bug" | "feature_request";
}

export interface UpdateIssueBody {
  title?: string;
  description?: string;
  type?: "bug" | "feature_request";
}

export interface IssueRecord {
  id: number;
  title: string;
  description: string;
  type: "bug" | "feature_request";
  status: "open" | "in_progress" | "resolved";
  reporter_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface IssueWithReporter extends IssueRecord {
  reporter: {
    id: number;
    name: string;
    role: string;
  };
}

export interface IssueQueryParams {
  sort?: "newest" | "oldest";
  type?: "bug" | "feature_request";
  status?: "open" | "in_progress" | "resolved";
}
