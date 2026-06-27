export const metadata = {
  title: "Almost made in Japan",
  description: "Wave tunnel"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
