"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton({ label }: { label: string }) {
  return (
    <Button
      className="h-11 w-full sm:w-auto"
      onClick={() => void signOut({ callbackUrl: "/" })}
    >
      {label}
    </Button>
  );
}
