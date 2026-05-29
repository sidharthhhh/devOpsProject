import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gRPC Chat",
  description: "Real-time chat application using gRPC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-900 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
