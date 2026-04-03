import "./globals.css";

export const metadata = {
  title: "VectorVault - AI Knowledge Retrieval Agent",
  description: "Ask natural-language questions and receive accurate, source-cited answers from your documents.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
