"use client";

import { usePathname } from "next/navigation";

const APP_ROUTES = [
  "/dashboard",
  "/plan",
  "/workout",
  "/exercises",
  "/progress",
  "/nutrition",
  "/coach",
  "/motivation",
  "/settings",
];

function getRouteKey(pathname: string) {
  const match = APP_ROUTES.find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  return match ?? pathname;
}

export default function RouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const routeKey = getRouteKey(pathname);
  const isAppPage = APP_ROUTES.includes(routeKey);

  return (
    <div
      className={isAppPage ? "fitmate-route fitmate-app-page" : "fitmate-route"}
      data-route={routeKey}
    >
      {children}
    </div>
  );
}
