import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <header className="page-head">
        <h1>No letter at this address</h1>
        <p>
          It may have been withdrawn, or the link was copied short. <Link href="/">Back to the letterbox.</Link>
        </p>
      </header>
    </div>
  );
}
