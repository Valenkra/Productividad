import type { Metadata } from "next";
import { LoginCard } from "@/features/auth/login-card";

export const metadata: Metadata = { title: "Entrar · Focus Garden" };

export default function LoginPage() {
  return <LoginCard />;
}
