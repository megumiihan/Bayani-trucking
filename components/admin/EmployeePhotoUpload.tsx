"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import EmployeeAvatar from "@/components/ui/EmployeeAvatar";
import { removeEmployeePhoto, uploadEmployeePhoto } from "@/lib/actions/employee";
import { EMPLOYEE_PHOTO_SIZE } from "@/lib/employeePhotos";
import { resizeImageToSquare } from "@/lib/resizeImage";

interface EmployeePhotoUploadProps {
  employeeId: string;
  name: string;
  photoUrl?: string | null;
}

export default function EmployeePhotoUpload({
  employeeId,
  name,
  photoUrl: initialPhotoUrl,
}: EmployeePhotoUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl ?? null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy("upload");
    try {
      const blob = await resizeImageToSquare(file, EMPLOYEE_PHOTO_SIZE);
      const ext = blob.type === "image/jpeg" ? "jpg" : "webp";
      const formData = new FormData();
      formData.append("photo", new File([blob], `photo.${ext}`, { type: blob.type }));

      const result = await uploadEmployeePhoto(employeeId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPhotoUrl(result.employee.photoUrl ?? null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setError(null);
    setBusy("remove");
    const result = await removeEmployeePhoto(employeeId);
    setBusy(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setPhotoUrl(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <EmployeeAvatar
          name={name}
          photoUrl={photoUrl}
          size={96}
          className="ring-4 ring-white shadow-md"
        />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70 text-xs font-medium text-gray-700">
            {busy === "upload" ? "Uploading…" : "Removing…"}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {photoUrl ? "Change photo" : "Add photo"}
        </button>
        {photoUrl && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={handleRemove}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="max-w-[12rem] text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
