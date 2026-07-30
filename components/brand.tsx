import Image from "next/image";

/** The Ztution icon mark — theme-agnostic (the source image is a filled badge with a transparent surround), reused by both the always-dark marketing pages and the light/dark dashboard. */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span className={`relative block shrink-0 ${className}`}>
      <Image src="/logo.png" alt="Ztution" fill sizes="40px" className="object-contain" priority />
    </span>
  );
}
