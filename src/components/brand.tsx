import Link from "next/link";
import { Sparkles } from "lucide-react";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Spelling Quest home">
      <span className="brand-icon">
        <Sparkles size={22} />
      </span>
      <span>
        spelling<span className="brand-light">quest</span>
        <span className="beta">POC</span>
      </span>
    </Link>
  );
}
