"use client";

import { useState } from "react";
import { bulkAssignCoursesToCompanies } from "@/lib/actions/company-course";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BookOpen, Building2, Search } from "lucide-react";

interface CourseItem {
  id: string;
  title: string;
  status: string;
}

interface CompanyItem {
  id: string;
  name: string;
  is_active: boolean;
}

interface ExistingAssignment {
  company_id: string;
  course_id: string;
}

interface BulkCourseAssignmentProps {
  courses: CourseItem[];
  companies: CompanyItem[];
  existingAssignments: ExistingAssignment[];
}

export function BulkCourseAssignment({
  courses,
  companies,
  existingAssignments,
}: BulkCourseAssignmentProps) {
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(
    new Set()
  );
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(
    new Set()
  );
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");

  const existingSet = new Set(
    existingAssignments.map((a) => `${a.company_id}:${a.course_id}`)
  );

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );
  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const toggleCourse = (id: string) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCompany = (id: string) => {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCourses = () => {
    setSelectedCourses(new Set(filteredCourses.map((c) => c.id)));
  };

  const selectAllCompanies = () => {
    setSelectedCompanies(
      new Set(filteredCompanies.filter((c) => c.is_active).map((c) => c.id))
    );
  };

  const newAssignmentCount = (() => {
    let count = 0;
    for (const companyId of selectedCompanies) {
      for (const courseId of selectedCourses) {
        if (!existingSet.has(`${companyId}:${courseId}`)) {
          count++;
        }
      }
    }
    return count;
  })();

  const handleAssign = async () => {
    if (selectedCourses.size === 0 || selectedCompanies.size === 0) {
      toast.error("コースと企業をそれぞれ1つ以上選択してください");
      return;
    }

    setLoading(true);
    try {
      const result = await bulkAssignCoursesToCompanies(
        Array.from(selectedCourses),
        Array.from(selectedCompanies),
        expiresAt || null
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `${selectedCompanies.size}社に${selectedCourses.size}コースを割り当てました`
        );
        setSelectedCourses(new Set());
        setSelectedCompanies(new Set());
        setExpiresAt("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Course selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4" />
                コース選択
                {selectedCourses.size > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {selectedCourses.size}
                  </span>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllCourses}
                type="button"
              >
                すべて選択
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="コースを検索..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <label
                    key={course.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-accent"
                  >
                    <Checkbox
                      checked={selectedCourses.has(course.id)}
                      onCheckedChange={() => toggleCourse(course.id)}
                    />
                    <span className="text-sm">{course.title}</span>
                  </label>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  コースが見つかりません
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                企業選択
                {selectedCompanies.size > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {selectedCompanies.size}
                  </span>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllCompanies}
                type="button"
              >
                有効企業を全選択
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="企業を検索..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <label
                    key={company.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-accent"
                  >
                    <Checkbox
                      checked={selectedCompanies.has(company.id)}
                      onCheckedChange={() => toggleCompany(company.id)}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{company.name}</span>
                      {!company.is_active && (
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">
                          無効
                        </span>
                      )}
                    </div>
                  </label>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  企業が見つかりません
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Options & submit */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Label htmlFor="expires_at">有効期限（任意）</Label>
              <Input
                id="expires_at"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {selectedCourses.size}コース x {selectedCompanies.size}社 ={" "}
                <span className="font-medium text-foreground">
                  {selectedCourses.size * selectedCompanies.size}件
                </span>
                {newAssignmentCount <
                  selectedCourses.size * selectedCompanies.size && (
                  <span className="ml-1">
                    （新規: {newAssignmentCount}件）
                  </span>
                )}
              </p>
              <Button
                onClick={handleAssign}
                disabled={
                  loading ||
                  selectedCourses.size === 0 ||
                  selectedCompanies.size === 0
                }
              >
                {loading ? "割り当て中..." : "一括割り当て"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
