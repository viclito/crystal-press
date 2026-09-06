import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, public tracking, uploads, and login
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/track") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Get session token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "c9f8a3d7e5b24168a0c4f39e872d61b5c904e287a1d3f65e49b8027a6f1c8e3d",
  });

  // If not logged in, redirect to /login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token.role as string) || "CASHIER";

  // Role Restrictions
  if (role === "CASHIER") {
    // Cashiers only have access to POS, Quotations, Estimator, Jobs, Challans, and Customers
    // Cashiers are strictly blocked from Dashboard (/), Inventory, Barcodes, Purchases, Vendors, Expenses, Reports, and Settings
    const allowedCashierPrefixes = [
      "/pos",
      "/quotations",
      "/calculator",
      "/jobs",
      "/challans",
      "/customers",
    ];

    const isAllowed = allowedCashierPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    );

    if (!isAllowed) {
      return NextResponse.redirect(new URL("/pos", req.url));
    }
  } else if (role === "MANAGER") {
    // Managers cannot access /settings or /reports
    if (pathname === "/settings" || pathname === "/reports") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
