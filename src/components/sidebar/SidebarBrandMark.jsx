"use client";

import BrandLogo from "@/components/brand/BrandLogo.jsx";

export default function SidebarBrandMark({ className = "" }) {
  return (
    <div
      className={`mb-[18px] flex min-h-[28px] items-center text-atc-text ${className}`.trim()}
    >
      <BrandLogo height={28} className="block h-[28px] w-auto" animated />
    </div>
  );
}
