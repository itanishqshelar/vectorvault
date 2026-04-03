import "./globals.css";

export const metadata = {
  title: "VectorVault - AI Knowledge Retrieval Agent",
  description: "Ask natural-language questions and receive accurate, source-cited answers from your documents.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
