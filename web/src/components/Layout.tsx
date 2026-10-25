import { useState } from "react";
import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { MenuSheet } from "./MenuSheet";

/** Wraps every screen except Opening with the site-wide top bar + menu sheet. */
export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <TopBar onMenuOpen={() => setMenuOpen(true)} />
      <Outlet />
      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
