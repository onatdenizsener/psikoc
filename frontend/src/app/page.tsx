"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      router.replace(user ? "/chat" : "/login");
    }
  }, [user, isLoading, router]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
