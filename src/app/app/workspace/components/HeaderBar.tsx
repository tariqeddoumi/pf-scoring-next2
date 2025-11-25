"use client";

import { Button } from "@/components/ui/button";

type HeaderBarProps = {
  client: { name: string; radical: string; segment?: string | null } | null;
  onSaveAll?: () => void;
  onOpenHistory?: () => void;
  onNewClient?: () => void;
};

export default function HeaderBar({
  client,
  onSaveAll,
  onOpenHistory,
  onNewClient,
}: HeaderBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3">
      <div className="flex flex-col">
        <h1 className="text-2xl font-semibold">Project Finance Scoring V5</h1>
        {client ? (
          <p className="text-sm text-muted-foreground">
            Client : <span className="font-medium">{client.name}</span> —{" "}
            <span className="font-mono">{client.radical}</span>
            {client.segment && <> — Segment : {client.segment}</>}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sélectionnez un client ou créez-en un nouveau pour commencer.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onNewClient}>
          Nouveau client
        </Button>
        <Button variant="outline" onClick={onOpenHistory} disabled={!client}>
          Historique
        </Button>
        <Button onClick={onSaveAll} disabled={!client}>
          Sauvegarder tout
        </Button>
      </div>
    </div>
  );
}
