"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptInvitation } from "@/lib/actions/invitation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "register" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function process() {
      const result = await acceptInvitation(token);
      if (result.error) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }

      if (result.existingUser) {
        setStatus("success");
        return;
      }

      // New user — show registration form
      setEmail(result.email ?? "");
      setCompanyId(result.companyId ?? "");
      setStatus("register");
    }
    process();
  }, [token]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password !== confirmPassword) {
      setFormError("パスワードが一致しません");
      return;
    }
    if (password.length < 8) {
      setFormError("パスワードは8文字以上で入力してください");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_id: companyId,
        },
      },
    });

    if (error) {
      setFormError("登録に失敗しました。もう一度お試しください。");
      setSubmitting(false);
      return;
    }

    setStatus("success");
    setSubmitting(false);
  };

  if (status === "loading") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">招待を確認中...</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">招待エラー</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button variant="outline">ログインページへ</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">招待を受け入れました</CardTitle>
          <CardDescription>
            アカウントの設定が完了しました。ログインして学習を始めましょう。
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button onClick={() => router.push("/login")}>ログインする</Button>
        </CardFooter>
      </Card>
    );
  }

  // Registration form for new users
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">アカウント作成</CardTitle>
        <CardDescription>
          招待を受け入れてアカウントを作成してください
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleRegister}>
        <CardContent className="space-y-4">
          {formError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <Label>メールアドレス</Label>
            <Input type="email" value={email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">氏名</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="山田 太郎"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              placeholder="8文字以上"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "登録中..." : "アカウントを作成"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
