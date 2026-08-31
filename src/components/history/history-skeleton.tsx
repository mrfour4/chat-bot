import { Skeleton } from "@/components/ui/skeleton";

export function HistorySkeleton() {
    return (
        <div className="mt-6 border-t border-rule">
            {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="border-b border-rule py-4">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="mt-2 h-3 w-24" />
                </div>
            ))}
        </div>
    );
}
