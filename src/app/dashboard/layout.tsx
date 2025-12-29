import { MainNav } from '@/components/dashboard/main-nav';
import { UserNav } from '@/components/dashboard/user-nav';
import { Logo } from '@/components/logo';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex h-16 items-center gap-2 border-b p-2">
            <Logo className="h-8 w-8 shrink-0 text-primary" />
            <div className="flex flex-col overflow-hidden">
                <span className="truncate font-headline text-lg">SalonFlow</span>
                <span className="text-xs text-muted-foreground truncate">My Awesome Salon</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <MainNav />
        </SidebarContent>
        <SidebarFooter>
            <Separator className="my-2" />
            <div className="p-2 text-center text-xs text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} SalonFlow India</p>
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger className="md:hidden"/>
            <div className="flex-1"></div>
            <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 bg-background p-4 md:gap-8 md:p-10">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
