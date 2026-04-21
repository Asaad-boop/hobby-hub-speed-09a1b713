import { Skeleton } from "@/components/ui/skeleton";
import { TableRow, TableCell } from "@/components/ui/table";

/**
 * Reusable loading skeleton for admin tables.
 * Use the standalone variant inside a wrapper div, or AdminTableSkeletonRows
 * to render placeholder TableRow elements inside an existing <Table>.
 */
export function AdminTableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="w-full">
      <div className="border-b border-border bg-muted/40 px-4 py-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-2/3" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid items-center gap-3 px-4 py-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className={c === 0 ? "h-4 w-4/5" : "h-3 w-3/5"} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminTableSkeletonRows({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <TableCell key={c}>
              <Skeleton className={c === 0 ? "h-4 w-4/5" : "h-3 w-3/5"} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
