import type { AdminOrderDetail } from "@/modules/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";

type OrderStatusTimelineProps = {
  history: AdminOrderDetail["statusHistory"];
};

export function OrderStatusTimeline({ history }: OrderStatusTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history yet.</p>
        ) : (
          <ol className="space-y-4">
            {history.map((entry) => (
              <li key={entry.id} className="border-l-2 border-muted pl-4">
                <p className="text-sm font-medium capitalize">
                  {entry.fromStatus
                    ? `${entry.fromStatus.replaceAll("_", " ")} → ${entry.toStatus.replaceAll("_", " ")}`
                    : entry.toStatus.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.createdAt.toLocaleString()} · {entry.actorLabel}
                </p>
                {entry.note ? (
                  <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
