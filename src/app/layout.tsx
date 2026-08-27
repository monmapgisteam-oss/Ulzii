import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ургамлан нөмрөгийн судалгааны мэдээллийн сан — Post rehab",
  description:
    "Нөхөн сэргээлтийн дараах ургамлан нөмрөгийн хээрийн судалгааны мэдээллийн сан, орон зайн шинжилгээний нэгдсэн систем",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#080d11",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body>{children}</body>
    </html>
  );
}
