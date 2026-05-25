import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { addDays } from "../utils/date";

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, businessName } = req.body as {
    email: string;
    password: string;
    businessName: string;
  };

  if (!email || !password || !businessName) {
    res.status(400).json({ error: "email, password and businessName are required" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { user, business } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, password_hash } });
    const business = await tx.business.create({
      data: { user_id: user.id, name: businessName },
    });
    await tx.businessSettings.create({
      data: {
        business_id: business.id,
        subscription_ends_at: addDays(new Date(), 30),
      },
    });
    return { user, business };
  });

  const token = jwt.sign(
    { sub: user.id, businessId: business.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "30d" }
  );

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email },
    business: { id: business.id, name: business.name },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const business = await prisma.business.findFirst({ where: { user_id: user.id } });
  if (!business) {
    res.status(404).json({ error: "No business found for this account" });
    return;
  }

  const token = jwt.sign(
    { sub: user.id, businessId: business.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "30d" }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email },
    business: { id: business.id, name: business.name },
  });
}
