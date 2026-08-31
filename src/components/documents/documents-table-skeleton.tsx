import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

export function DocumentsTableSkeleton({ rows }: { rows: number }) {
    return (
        <>
            {Array.from({ length: rows }, (_, index) => (
                <TableRow key={index}>
                    <TableCell>
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="mt-2 h-3 w-1/3" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-5 w-20 rounded-full" />
                    </TableCell>
                    <TableCell />
                </TableRow>
            ))}
        </>
    );
}
