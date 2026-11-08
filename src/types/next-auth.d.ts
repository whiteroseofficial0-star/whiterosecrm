import type { DefaultSession } from "next-auth";
import type { RoleName } from "@/lib/rbac";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: RoleName;
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User {
    role: RoleName;
    permissions: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: RoleName;
    permissions: string[];
  }
}
