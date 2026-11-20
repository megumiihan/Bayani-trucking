/** Supabase Storage bucket holding employee photos. Public-read; writes go through server actions. */
export const EMPLOYEE_PHOTO_BUCKET = "employee-photos";

/** Photos are resized in the browser to this square size before upload. */
export const EMPLOYEE_PHOTO_SIZE = 256;

/** Upload size ceiling. A 256px WebP is ~20–40 KB, so this only rejects bad input. */
export const EMPLOYEE_PHOTO_MAX_BYTES = 1024 * 1024;

export const EMPLOYEE_PHOTO_TYPES = ["image/webp", "image/jpeg"] as const;

export function employeePhotoUrl(photoPath: string | null | undefined): string | null {
  if (!photoPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${EMPLOYEE_PHOTO_BUCKET}/${photoPath}`;
}
