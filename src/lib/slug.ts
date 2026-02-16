export function generateSlug(title: string): string {
  // Extract ASCII-safe characters from the title
  const ascii = title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  // Generate a short unique suffix
  const uid = crypto.randomUUID().split("-")[0]; // 8 chars

  // If ASCII portion exists (e.g., "React Course"), use it; otherwise UUID-based
  if (ascii && ascii.length > 2) {
    return `${ascii}-${uid}`;
  }
  return `course-${uid}`;
}
