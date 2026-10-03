import { BottomNav, MobileTopBar, Sidebar } from "@/components/nav";
import { QuickAddProvider } from "@/components/quick-add-dialog";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <QuickAddProvider>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-28 md:px-10 md:pt-10 md:pb-12">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </QuickAddProvider>
  );
}
