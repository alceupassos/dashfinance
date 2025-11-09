"use client";

import { useQuery } from "@tanstack/react-query";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatShortDate } from "@/lib/formatters";

export default function NotificationsPage() {
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications
  });

  const colors: Record<string, "success" | "warning" | "destructive" | "outline"> = {
    success: "success",
    warning: "warning",
    error: "destructive",
    info: "outline"
  };

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-sm">Notificações</CardTitle>
          <p className="text-[11px] text-muted-foreground">Alertas críticos, avisos operacionais e confirmações.</p>
        </div>
        <Button size="sm" variant="outline" onClick={markAllNotificationsRead}>
          Marcar todas como lidas
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {data?.map((notification) => (
          <div
            key={notification.id}
            className="space-y-2 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                <p>{notification.description}</p>
              </div>
              <Badge variant={colors[notification.type] ?? "outline"}>{notification.type}</Badge>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{formatShortDate(notification.createdAt)}</span>
              {!notification.read && (
                <Button size="sm" variant="ghost" onClick={markNotificationRead}>
                  Marcar como lida
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
