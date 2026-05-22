export interface RegisterBody {
  name: string;
  email: string;
  password: string;
  role: "contributor" | "maintainer";
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password: string;
  role: "contributor" | "maintainer";
  created_at: Date;
  updated_at: Date;
}

export interface JwtPayload {
  id: number;
  name: string;
  role: "contributor" | "maintainer";
}
