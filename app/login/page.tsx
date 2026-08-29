import { Suspense } from "react";
import LoginScreen from "@/components/LoginScreen";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
