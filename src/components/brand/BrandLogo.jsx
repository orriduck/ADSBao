import Image from "next/image";
import logoLight from "../../../public/brand/logo-light.png";
import logoDark from "../../../public/brand/logo-dark.png";

export default function BrandLogo({ height = 44, className = "" }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src={logoLight}
        alt="ADSBao"
        height={height}
        width={Math.round((logoLight.width / logoLight.height) * height)}
        className="dark:hidden"
        priority
      />
      <Image
        src={logoDark}
        alt="ADSBao"
        height={height}
        width={Math.round((logoDark.width / logoDark.height) * height)}
        className="hidden dark:block"
        priority
      />
    </span>
  );
}
