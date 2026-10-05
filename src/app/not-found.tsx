import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#040D0A] text-[#F0FDF4] p-4 text-center">
      <div className="relative w-20 h-20 mb-6 rounded-2xl overflow-hidden p-1.5 bg-[#081712] border border-[#1E463A] shadow-[0_0_30px_rgba(16,185,129,0.25)]">
        <Image
          src="/logo.png"
          alt="Echo Shelf Emblem"
          width={80}
          height={80}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#0E241D] text-[#34D399] border border-[#16382E] mb-4">
        404 &bull; Page Not Found
      </span>

      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F0FDF4] mb-2">
        Knowledge Coordinate Not Found
      </h1>
      <p className="text-sm text-[#9FE1CB]/70 max-w-md mx-auto mb-8 leading-relaxed">
        The vault resource or page you requested does not exist or has been moved.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/library"
          className="px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
        >
          Return to Library &rarr;
        </Link>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl border border-[#16382E] bg-[#081712] text-xs font-semibold text-[#9FE1CB] hover:bg-[#0E241D] hover:text-[#F0FDF4] transition-colors"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
