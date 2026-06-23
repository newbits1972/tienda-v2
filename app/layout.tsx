import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ContentLayout } from "@/components/layout/ContentLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { NetworkStatus } from "@/components/ui/NetworkStatus";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "DataSense Retail - Gestión de Indumentaria",
    description: "Sistema integral de punto de venta y gestión para gastronomía y delivery",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <body className={inter.className}>
                <AuthProvider>
                    <BrandingProvider>
                        <BranchProvider>
                        <ContentLayout>
                            <NetworkStatus />
                            {children}
                            <Toaster />
                        </ContentLayout>
                        </BranchProvider>
                    </BrandingProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
