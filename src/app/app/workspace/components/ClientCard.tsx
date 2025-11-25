"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Client = {
  id: string;
  name: string;
  radical: string;
  segment?: string | null;
  entity_type?: string | null;
  country?: string | null;
  city?: string | null;
  group_name?: string | null;
  sponsor_main?: string | null;
  internal_rating?: string | null;
};

export default function ClientCard({ client }: { client: Client }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{client.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Radical : <span className="font-mono">{client.radical}</span>
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="font-medium">Segment :</span>{" "}
          {client.segment || "-"}
        </div>
        <div>
          <span className="font-medium">Type entité :</span>{" "}
          {client.entity_type || "-"}
        </div>
        <div>
          <span className="font-medium">Pays :</span> {client.country || "-"}
        </div>
        <div>
          <span className="font-medium">Ville :</span> {client.city || "-"}
        </div>
        <div>
          <span className="font-medium">Groupe :</span>{" "}
          {client.group_name || "-"}
        </div>
        <div>
          <span className="font-medium">Sponsor principal :</span>{" "}
          {client.sponsor_main || "-"}
        </div>
        <div>
          <span className="font-medium">Notation interne :</span>{" "}
          {client.internal_rating || "-"}
        </div>
      </CardContent>
    </Card>
  );
}
