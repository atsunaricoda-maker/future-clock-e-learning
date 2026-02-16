"use client";

import { useState } from "react";
import { inviteMembers, cancelInvitation } from "@/lib/actions/invitation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Plus, X, Clock, CheckCircle2, XCircle } from "lucide-react";

interface PendingInvitation {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
}

interface MemberInviteFormProps {
  pendingInvitations: PendingInvitation[];
}

export function MemberInviteForm({ pendingInvitations }: MemberInviteFormProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    { email: string; status: "sent" | "exists" | "error"; message: string }[]
  >([]);

  const addEmailField = () => {
    setEmails([...emails, ""]);
  };

  const removeEmailField = (index: number) => {
    if (emails.length <= 1) return;
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const updated = [...emails];
    updated[index] = value;
    setEmails(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validEmails = emails.filter((e) => e.trim());
    if (validEmails.length === 0) {
      toast.error("メールアドレスを入力してください");
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const result = await inviteMembers(validEmails);
      setResults(result.results);

      const sentCount = result.results.filter((r) => r.status === "sent").length;
      if (sentCount > 0) {
        toast.success(`${sentCount}件の招待メールを送信しました`);
        setEmails([""]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (invitationId: string) => {
    const result = await cancelInvitation(invitationId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("招待をキャンセルしました");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            社員を招待
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>メールアドレス</Label>
              {emails.map((email, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="example@company.co.jp"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                  />
                  {emails.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEmailField(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmailField}
              >
                <Plus className="mr-1 h-3 w-3" />
                追加
              </Button>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "送信中..." : "招待メールを送信"}
              </Button>
            </div>
          </form>

          {results.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label>送信結果</Label>
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md border p-2 text-sm"
                >
                  {r.status === "sent" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : r.status === "exists" ? (
                    <Clock className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-mono text-xs">{r.email}</span>
                  <span className="text-muted-foreground">— {r.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              招待中（{pendingInvitations.length}件）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvitations.map((inv) => {
                const isExpired = new Date(inv.expires_at) < new Date();
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString("ja-JP")}{" "}
                        に招待
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpired ? (
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50 text-red-700"
                        >
                          期限切れ
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-yellow-200 bg-yellow-50 text-yellow-700"
                        >
                          承認待ち
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(inv.id)}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
