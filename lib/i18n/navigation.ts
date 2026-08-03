import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

// Locale-aware Link/useRouter/usePathname/redirect — automatically
// prepend/strip the /mx or /us market prefix, so callers keep using plain
// paths ("/shop", "/cuenta") exactly like before the market split.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
