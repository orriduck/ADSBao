"use client";

import BrandLogo from "@/components/brand/BrandLogo.jsx";

export default function SidebarBrandMark({ className = "" }) {
  return (
    <div className={`sidebar-brand-mark ${className}`.trim()}>
      <BrandLogo height={28} className="sidebar-brand-mark__logo" animated />
    </div>
  );
}
