"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { mapEmployeeToUi, toDbRole, toUiRole } from "@/lib/mappers/employee";
import { trimOrNull } from "@/lib/mappers/shipmentRemarks";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  EMPLOYEE_PHOTO_BUCKET,
  EMPLOYEE_PHOTO_MAX_BYTES,
  EMPLOYEE_PHOTO_TYPES,
} from "@/lib/employeePhotos";
import { BOUNTY_EXP_NEW, BOUNTY_EXP_OLD } from "@/lib/weight";
import { decryptPassword } from "@/lib/credentialCrypto";
import {
  provisionLogin,
  resetLoginPassword,
  type LoginCredentials,
} from "@/lib/employeeAccounts";
import type { Employee, EmployeeRole } from "@/lib/mockData";

const EMPLOYEE_ROLES: EmployeeRole[] = ["Driver", "Helper", "Secretary"];

export type UpdateEmployeeRemarksResult =
  | { success: true; employee: Employee }
  | { success: false; error: string };

export interface EmployeeDetailsInput {
  name: string;
  role: EmployeeRole;
  bountyExp: string;
  isActive: boolean;
  isRegular: boolean;
}

export async function updateEmployeeDetails(
  id: string,
  input: EmployeeDetailsInput
): Promise<UpdateEmployeeRemarksResult> {
  try {
    await requireAdmin();

    const fullName = input.name.trim().replace(/\s+/g, " ");
    if (!fullName) return { success: false, error: "Name is required." };
    if (!EMPLOYEE_ROLES.includes(input.role)) {
      return { success: false, error: "Role must be Driver, Helper or Secretary." };
    }
    if (input.bountyExp !== BOUNTY_EXP_OLD && input.bountyExp !== BOUNTY_EXP_NEW) {
      return { success: false, error: "Choose a bounty experience." };
    }

    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { fullName: true },
    });
    if (!existing) return { success: false, error: "Employee not found." };

    const oldName = existing.fullName;
    const renamed = fullName !== oldName;

    if (renamed) {
      const clash = await prisma.employee.findFirst({
        where: { id: { not: id }, fullName: { equals: fullName, mode: "insensitive" } },
        select: { id: true },
      });
      if (clash) {
        return { success: false, error: `Another employee is already named "${fullName}".` };
      }
    }

    // Shipments keep a snapshot of crew names and payouts are matched by name,
    // so a rename has to carry over to this employee's existing shipments.
    const updated = await prisma.$transaction(async (tx) => {
      if (renamed) {
        await tx.shipmentLog.updateMany({
          where: { OR: [{ driverId: id }, { driverId: null, driverName: oldName }] },
          data: { driverName: fullName },
        });
        await tx.shipmentLog.updateMany({
          where: { OR: [{ helperId: id }, { helperId: null, helperName: oldName }] },
          data: { helperName: fullName },
        });
        await tx.shipmentLog.updateMany({
          where: { extraHelperName: oldName },
          data: { extraHelperName: fullName },
        });
      }

      return tx.employee.update({
        where: { id },
        data: {
          fullName,
          role: toDbRole(input.role),
          bountyExp: input.bountyExp,
          isActive: input.isActive,
          isRegular: input.isRegular === true,
        },
      });
    });

    // Keep the login's access in step with the role. Admin logins are left alone.
    await prisma.profile.updateMany({
      where: { employeeId: id, role: { not: "ADMIN" } },
      data: { role: input.role === "Secretary" ? "SECRETARY" : "EMPLOYEE" },
    });

    revalidatePath("/admin/employees");
    revalidatePath(`/admin/employees/${id}`);
    revalidatePath("/admin/bookkeeping");
    revalidatePath("/employee/profile");
    revalidatePath("/employee/shipments/new");
    revalidatePath("/");

    return { success: true, employee: mapEmployeeToUi(updated) };
  } catch (error) {
    console.error("[updateEmployeeDetails]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating the employee.",
    };
  }
}

/**
 * Role-only edit for office staff. Secretaries can switch people between Driver and
 * Helper; making someone a Secretary (or taking that away) changes what their login
 * can reach, so that stays with admins.
 */
export async function updateEmployeeRole(
  id: string,
  role: EmployeeRole
): Promise<UpdateEmployeeRemarksResult> {
  try {
    const user = await requireStaff();

    if (!EMPLOYEE_ROLES.includes(role)) {
      return { success: false, error: "Role must be Driver, Helper or Secretary." };
    }

    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!existing) return { success: false, error: "Employee not found." };

    if (user.role !== "admin") {
      if (user.employeeId === id) {
        return { success: false, error: "Ask an admin to change your own role." };
      }
      if (role === "Secretary" || existing.role === "SECRETARY") {
        return { success: false, error: "Only an admin can add or remove the Secretary role." };
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { role: toDbRole(role) },
    });

    // Keep the login's access in step with the role. Admin logins are left alone.
    await prisma.profile.updateMany({
      where: { employeeId: id, role: { not: "ADMIN" } },
      data: { role: role === "Secretary" ? "SECRETARY" : "EMPLOYEE" },
    });

    revalidatePath("/admin/employees");
    revalidatePath(`/admin/employees/${id}`);
    revalidatePath("/admin/bookkeeping");
    revalidatePath("/employee/profile");
    revalidatePath("/employee/shipments/new");
    revalidatePath("/");

    return { success: true, employee: mapEmployeeToUi(updated) };
  } catch (error) {
    console.error("[updateEmployeeRole]", error);
    return {
      success: false,
      error: errorMessage(error, "An unexpected error occurred while updating the role."),
    };
  }
}

export async function updateEmployeeBountyExp(
  id: string,
  bountyExp: string
): Promise<UpdateEmployeeRemarksResult> {
  try {
    await requireAdmin();

    const tag = bountyExp.trim();
    if (!tag) return { success: false, error: "Bounty experience tag is required." };

    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return { success: false, error: "Employee not found." };

    const updated = await prisma.employee.update({
      where: { id },
      data: { bountyExp: tag },
    });

    revalidatePath("/admin/employees");
    revalidatePath(`/admin/employees/${id}`);
    revalidatePath("/employee/profile");
    revalidatePath("/employee/shipments/new");
    revalidatePath("/");

    return { success: true, employee: mapEmployeeToUi(updated) };
  } catch (error) {
    console.error("[updateEmployeeBountyExp]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating bounty experience.",
    };
  }
}

export async function updateEmployeeRemarks(
  id: string,
  remarks: string
): Promise<UpdateEmployeeRemarksResult> {
  try {
    await requireAdmin();

    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: "Employee not found." };
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { remarks: trimOrNull(remarks) },
    });

    revalidatePath("/admin/employees");
    revalidatePath(`/admin/employees/${id}`);
    revalidatePath("/employee/profile");

    return { success: true, employee: mapEmployeeToUi(updated) };
  } catch (error) {
    console.error("[updateEmployeeRemarks]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating employee remarks.",
    };
  }
}

function revalidateEmployeePhotoPaths(id: string) {
  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${id}`);
  revalidatePath("/employee/profile");
}

async function removeStoredPhoto(path: string | null) {
  if (!path) return;
  const { error } = await createSupabaseAdminClient()
    .storage.from(EMPLOYEE_PHOTO_BUCKET)
    .remove([path]);
  // The row no longer points at it, so an orphaned file is harmless; just log it.
  if (error) console.error("[removeStoredPhoto]", path, error);
}

/** Expects FormData with a `photo` file, already resized in the browser. */
export async function uploadEmployeePhoto(
  id: string,
  formData: FormData
): Promise<UpdateEmployeeRemarksResult> {
  try {
    await requireAdmin();

    const photo = formData.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      return { success: false, error: "Choose an image to upload." };
    }
    if (!(EMPLOYEE_PHOTO_TYPES as readonly string[]).includes(photo.type)) {
      return { success: false, error: "Photo must be a WebP or JPEG image." };
    }
    if (photo.size > EMPLOYEE_PHOTO_MAX_BYTES) {
      return { success: false, error: "Photo is larger than 1 MB." };
    }

    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { photoPath: true },
    });
    if (!existing) return { success: false, error: "Employee not found." };

    // A fresh name per upload lets browsers cache each file forever without
    // ever showing a replaced photo.
    const ext = photo.type === "image/jpeg" ? "jpg" : "webp";
    const path = `${id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await createSupabaseAdminClient()
      .storage.from(EMPLOYEE_PHOTO_BUCKET)
      .upload(path, photo, {
        contentType: photo.type,
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { photoPath: path },
    });

    await removeStoredPhoto(existing.photoPath);
    revalidateEmployeePhotoPaths(id);

    return { success: true, employee: mapEmployeeToUi(updated) };
  } catch (error) {
    console.error("[uploadEmployeePhoto]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while uploading the photo.",
    };
  }
}

export async function removeEmployeePhoto(
  id: string
): Promise<UpdateEmployeeRemarksResult> {
  try {
    await requireAdmin();

    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { photoPath: true },
    });
    if (!existing) return { success: false, error: "Employee not found." };

    const updated = await prisma.employee.update({
      where: { id },
      data: { photoPath: null },
    });

    await removeStoredPhoto(existing.photoPath);
    revalidateEmployeePhotoPaths(id);

    return { success: true, employee: mapEmployeeToUi(updated) };
  } catch (error) {
    console.error("[removeEmployeePhoto]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while removing the photo.",
    };
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function revalidateRoster(id?: string) {
  revalidatePath("/admin/employees");
  if (id) revalidatePath(`/admin/employees/${id}`);
  revalidatePath("/admin/bookkeeping");
  revalidatePath("/employee/shipments/new");
  revalidatePath("/");
}

export interface NewEmployeeInput {
  name: string;
  role: EmployeeRole;
  bountyExp: string;
  remarks: string;
  createLogin: boolean;
}

export type CreateEmployeeResult =
  | {
      success: true;
      employee: Employee;
      credentials: LoginCredentials | null;
      /** Set when the employee was saved but their login could not be created. */
      loginError: string | null;
    }
  | { success: false; error: string };

export async function createEmployee(input: NewEmployeeInput): Promise<CreateEmployeeResult> {
  try {
    await requireAdmin();

    const fullName = input.name.trim().replace(/\s+/g, " ");
    if (!fullName) return { success: false, error: "Name is required." };
    if (!EMPLOYEE_ROLES.includes(input.role)) {
      return { success: false, error: "Role must be Driver, Helper or Secretary." };
    }
    if (input.bountyExp !== BOUNTY_EXP_OLD && input.bountyExp !== BOUNTY_EXP_NEW) {
      return { success: false, error: "Choose a bounty experience." };
    }

    const clash = await prisma.employee.findFirst({
      where: { fullName: { equals: fullName, mode: "insensitive" } },
      select: { id: true },
    });
    if (clash) {
      return { success: false, error: `An employee named "${fullName}" already exists.` };
    }

    const created = await prisma.employee.create({
      data: {
        fullName,
        role: toDbRole(input.role),
        bountyExp: input.bountyExp,
        isActive: true,
        remarks: trimOrNull(input.remarks),
      },
    });

    let credentials: LoginCredentials | null = null;
    let loginError: string | null = null;
    if (input.createLogin) {
      try {
        credentials = await provisionLogin(prisma, created);
      } catch (error) {
        console.error("[createEmployee] login", error);
        loginError = errorMessage(error, "The login could not be created.");
      }
    }

    revalidateRoster(created.id);
    return { success: true, employee: mapEmployeeToUi(created), credentials, loginError };
  } catch (error) {
    console.error("[createEmployee]", error);
    return {
      success: false,
      error: errorMessage(error, "An unexpected error occurred while adding the employee."),
    };
  }
}

export type CredentialsResult =
  | { success: true; credentials: LoginCredentials }
  | { success: false; error: string };

export async function createEmployeeLogin(id: string): Promise<CredentialsResult> {
  try {
    const admin = await requireAdmin();

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        role: true,
        isActive: true,
        profile: { select: { id: true } },
      },
    });
    if (!employee) return { success: false, error: "Employee not found." };
    if (employee.profile) return { success: false, error: "This employee already has a login." };
    if (!employee.isActive) {
      return { success: false, error: "Mark the employee active before creating a login." };
    }

    const credentials = await provisionLogin(prisma, employee);
    console.info(`[createEmployeeLogin] ${admin.email} created login for employee ${id}`);

    revalidatePath(`/admin/employees/${id}`);
    return { success: true, credentials };
  } catch (error) {
    console.error("[createEmployeeLogin]", error);
    return { success: false, error: errorMessage(error, "Could not create the login.") };
  }
}

export interface StoredCredentials {
  email: string;
  /** Null when no password is on file (accounts made before passwords were stored). */
  password: string | null;
  passwordError: string | null;
}

function readStoredPassword(encrypted: string | null) {
  if (!encrypted) return { password: null, passwordError: null };
  try {
    return { password: decryptPassword(encrypted), passwordError: null };
  } catch (error) {
    return { password: null, passwordError: errorMessage(error, "Could not read the password.") };
  }
}

export type StoredCredentialsResult =
  | { success: true; credentials: StoredCredentials }
  | { success: false; error: string };

export async function getEmployeeCredentials(id: string): Promise<StoredCredentialsResult> {
  try {
    const admin = await requireAdmin();

    const profile = await prisma.profile.findUnique({
      where: { employeeId: id },
      select: { email: true, encryptedPassword: true },
    });
    if (!profile) return { success: false, error: "This employee has no login." };

    console.info(`[getEmployeeCredentials] ${admin.email} viewed login for employee ${id}`);
    return {
      success: true,
      credentials: { email: profile.email, ...readStoredPassword(profile.encryptedPassword) },
    };
  } catch (error) {
    console.error("[getEmployeeCredentials]", error);
    return { success: false, error: errorMessage(error, "Could not load the login.") };
  }
}

export async function resetEmployeePassword(id: string): Promise<CredentialsResult> {
  try {
    const admin = await requireAdmin();

    const profile = await prisma.profile.findUnique({
      where: { employeeId: id },
      select: { id: true, email: true },
    });
    if (!profile) return { success: false, error: "This employee has no login." };

    const password = await resetLoginPassword(prisma, profile.id);
    console.info(`[resetEmployeePassword] ${admin.email} reset password for employee ${id}`);

    return { success: true, credentials: { email: profile.email, password } };
  } catch (error) {
    console.error("[resetEmployeePassword]", error);
    return { success: false, error: errorMessage(error, "Could not reset the password.") };
  }
}

export interface EmployeeLoginRow extends StoredCredentials {
  employeeId: string;
  name: string;
  role: EmployeeRole;
  isActive: boolean;
}

export type AllCredentialsResult =
  | { success: true; rows: EmployeeLoginRow[] }
  | { success: false; error: string };

export async function getAllEmployeeCredentials(): Promise<AllCredentialsResult> {
  try {
    const admin = await requireAdmin();

    const employees = await prisma.employee.findMany({
      where: { profile: { isNot: null } },
      orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        role: true,
        isActive: true,
        profile: { select: { email: true, encryptedPassword: true } },
      },
    });

    console.info(`[getAllEmployeeCredentials] ${admin.email} viewed all logins`);
    return {
      success: true,
      rows: employees.flatMap((employee) =>
        employee.profile
          ? [
              {
                employeeId: employee.id,
                name: employee.fullName,
                role: toUiRole(employee.role),
                isActive: employee.isActive,
                email: employee.profile.email,
                ...readStoredPassword(employee.profile.encryptedPassword),
              },
            ]
          : []
      ),
    };
  } catch (error) {
    console.error("[getAllEmployeeCredentials]", error);
    return { success: false, error: errorMessage(error, "Could not load logins.") };
  }
}
