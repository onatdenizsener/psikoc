"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/chat");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-extrabold text-[#6C63FF] text-center mb-2">PsiKoç</h1>
        <p className="text-center text-gray-400 mb-10">Duygusal destek asistanın</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-8 flex flex-col gap-4 border border-[#E0DCFF]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-[#E0DCFF] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#6C63FF] transition"
          />
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border border-[#E0DCFF] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#6C63FF] transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#6C63FF] text-white rounded-xl py-3 font-semibold hover:bg-[#5a52e0] transition disabled:opacity-50"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
          <p className="text-center text-sm text-gray-400">
            Hesabın yok mu?{" "}
            <Link href="/register" className="text-[#6C63FF] font-medium hover:underline">
              Kayıt ol
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
