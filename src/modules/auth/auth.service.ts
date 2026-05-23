import pool from "../../config/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type {
  RegisterBody,
  LoginBody,
  UserRecord,
  JwtPayload,
} from "./auth.interface";

const SALT_ROUNDS = 10;

// [POST] -> /api/auth/signup
export const registerUser = async (
  body: RegisterBody,
): Promise<Omit<UserRecord, "password">> => {
  const { name, email, password, role } = body;

  // Check dUplicate email
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (existing.rows.length > 0) {
    throw { statusCode: 400, message: "Email already registered" };
  }
  // Hash the password
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  // Insert the new user into the database
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at, updated_at`,
    [name, email, hashed, role],
  );

  // Return the created user without the password
  const newUser = result.rows[0];
  if (!newUser) {
    throw { statusCode: 500, message: "Failed to create user" };
  }

  return newUser;
};

// [POST] -> /api/auth/login
export const loginUser = async (
  body: LoginBody,
): Promise<{ token: string; user: Omit<UserRecord, "password"> }> => {
  const { email, password } = body;

  const result = await pool.query<UserRecord>(
    "SELECT * FROM users WHERE email = $1",
    [email],
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

  const payload: JwtPayload = { id: user.id, name: user.name, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });

  const { password: _pw, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};
