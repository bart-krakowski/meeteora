import { redirect } from "next/navigation";
import { AuthShowcase } from "@/components/auth/auth-showcase";
import { getSession } from "@/lib/auth/session";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getSession()) redirect("/");

  return (
    <div className="h-dvh lg:grid lg:grid-cols-2">
      <div className="flex h-full items-center justify-center sm:px-6 md:px-8">
        <main className="flex w-full flex-col gap-6 p-6 sm:max-w-lg">
          {children}
        </main>
      </div>
      <div className="h-dvh bg-muted max-lg:hidden">
        <AuthShowcase />
      </div>
    </div>
  );
}
