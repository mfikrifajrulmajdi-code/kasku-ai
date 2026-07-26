import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#0f0c29] via-[#24243e] to-[#0f0c29]">
      <AppSidebar />
      <div className="flex-1 flex flex-col lg:pl-72 w-full transition-all duration-300">
        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
