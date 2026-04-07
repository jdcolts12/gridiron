import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Page not found</h1>
      <p className="text-zinc-400">
        That URL does not match any route in this app.
      </p>
      <Link
        href="/"
        className="inline-flex text-emerald-400 underline hover:text-emerald-300"
      >
        Back to home
      </Link>
    </div>
  );
}
