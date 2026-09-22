import type { Product } from "@/content/products";

export function ProductCard({
  product,
  onView,
}: {
  product: Product;
  onView: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* eslint-disable-next-line @next/next/no-img-element -- fixture images are local static SVGs, not remote/optimized assets */}
      <img
        src={product.image}
        alt=""
        width={400}
        height={300}
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="flex min-h-[6.5rem] flex-1 flex-col gap-1 p-3">
        <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {product.category}
        </span>
        <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {product.name}
        </h3>
        <a
          href={product.destination_url}
          onClick={onView}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto pt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          View product
        </a>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div
      className="flex h-full animate-pulse flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      aria-hidden="true"
    >
      <div className="aspect-[4/3] w-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex min-h-[6.5rem] flex-1 flex-col gap-1 p-3">
        <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-auto h-5 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
