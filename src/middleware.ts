export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/pulpit/:path*", "/klienci/:path*", "/ustawienia/:path*"],
};
