/**
 * Creates (or updates) the app's Supabase Storage buckets.
 *
 *   npm run db:storage
 *
 * - employee-photos     PUBLIC read, so <img> tags load profile photos directly.
 * - employee-documents  PRIVATE. PhilHealth / SSS card photos and other sensitive
 *                       files; only viewable through short-lived signed URLs that
 *                       admin-only server actions create.
 *
 * Neither bucket has write policies: all uploads go through server actions that
 * check requireAdmin() and write with the service-role key. Safe to re-run.
 */
import { createClient } from "@supabase/supabase-js";
import {
  EMPLOYEE_PHOTO_BUCKET,
  EMPLOYEE_PHOTO_MAX_BYTES,
  EMPLOYEE_PHOTO_TYPES,
} from "../lib/employeePhotos";
import {
  EMPLOYEE_DOCUMENT_BUCKET,
  EMPLOYEE_DOCUMENT_MAX_BYTES,
  EMPLOYEE_DOCUMENT_TYPES,
} from "../lib/governmentIds";

const buckets = [
  {
    name: EMPLOYEE_PHOTO_BUCKET,
    options: {
      public: true,
      fileSizeLimit: EMPLOYEE_PHOTO_MAX_BYTES,
      allowedMimeTypes: [...EMPLOYEE_PHOTO_TYPES],
    },
  },
  {
    name: EMPLOYEE_DOCUMENT_BUCKET,
    options: {
      public: false,
      fileSizeLimit: EMPLOYEE_DOCUMENT_MAX_BYTES,
      allowedMimeTypes: [...EMPLOYEE_DOCUMENT_TYPES],
    },
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const { name, options } of buckets) {
    const { data: existing } = await supabase.storage.getBucket(name);
    const { error } = existing
      ? await supabase.storage.updateBucket(name, options)
      : await supabase.storage.createBucket(name, options);
    if (error) throw error;
    console.log(
      `${existing ? "Updated" : "Created"} bucket "${name}" (${options.public ? "public" : "private"}).`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
