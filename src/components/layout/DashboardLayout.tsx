import { ReactNode, useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/firebase/auth-context";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  FileText,
  Users,
  Phone,
  LogOut,
  Plug,
  FileSymlink,
  Shield,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { currentUser, logOut } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  // Vérifier si l'utilisateur est administrateur
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) return;

      try {
        const token = await currentUser.getIdTokenResult();
        setIsAdmin(!!token.claims.admin);
      } catch (error) {
        console.error("Erreur lors de la vérification du statut admin:", error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [currentUser]);

  const gererDeconnexion = async () => {
    try {
      await logOut();
      router.navigate({ to: "/login" });
    } catch (error) {
      console.error("Échec de la déconnexion", error);
    }
  };

  const elementsNavigation = [
    { icon: <Home className="h-4 w-4" />, label: "Accueil", href: "/" },
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Documents",
      href: "/documents",
    },
    {
      icon: <FileSymlink className="h-4 w-4" />,
      label: "Templates",
      href: "/templates",
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Patients",
      href: "/patients",
    },
    {
      icon: <Phone className="h-4 w-4" />,
      label: "Contacts",
      href: "/contacts",
    },
    {
      icon: <Plug className="h-4 w-4" />,
      label: "Intégrations",
      href: "/integrations",
    },
    // Afficher le lien d'administration uniquement pour les administrateurs
    ...(isAdmin
      ? [
          {
            icon: <Shield className="h-4 w-4" />,
            label: "Administration",
            href: "/admin",
          },
        ]
      : []),
  ];

  const initialesUtilisateur = currentUser?.email
    ? currentUser.email.substring(0, 2).toUpperCase()
    : "U";

  return (
    <div className="flex h-screen bg-background">
      <SidebarProvider>
        <>
          <Sidebar>
            <SidebarHeader className="px-4 py-2">
              <h1 className="text-xl font-bold">Dentiste</h1>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {elementsNavigation.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link
                      to={item.href}
                      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors"
                    >
                      <SidebarMenuButton asChild>
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={currentUser?.photoURL || ""} />
                    <AvatarFallback>{initialesUtilisateur}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <p className="font-medium">
                      {currentUser?.displayName || currentUser?.email}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={gererDeconnexion}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </SidebarFooter>
          </Sidebar>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </>
      </SidebarProvider>
    </div>
  );
}
