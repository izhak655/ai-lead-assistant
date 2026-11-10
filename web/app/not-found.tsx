import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page">
      <h1>Page not found</h1>
      <p className="lede">That view is not part of this demo.</p>
      <Link href="/" className="button">
        Back to overview
      </Link>
    </div>
  );
}
