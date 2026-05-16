import Image from "next/image";
import iconLight from "../../../public/brand/icon-light.png";
import iconDark from "../../../public/brand/icon-dark.png";

export default function BrandIcon({ height = 20, className = "" }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src={iconLight}
        alt="ADSBao"
        height={height}
        width={Math.round((iconLight.width / iconLight.height) * height)}
        className="dark:hidden"
      />
      <Image
        src={iconDark}
        alt="ADSBao"
        height={height}
        width={Math.round((iconDark.width / iconDark.height) * height)}
        className="hidden dark:block"
      />
    </span>
  );
}
