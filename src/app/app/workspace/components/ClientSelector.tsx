"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Client = {
  id: string;
  name: string;
  radical: string;
  segment?: string | null;
};

type ClientSelectorProps = {
  onSelect: (client: Client | null) => void;
};

export default function ClientSelector({ onSelect }: ClientSelectorProps) {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, radical, segment")
        .or(
          `name.ilike.%${search}%,radical.ilike.%${search}%`
        )
        .order("name")
        .limit(30);

      if (!error && data) setClients(data as Client[]);
    };
    fetchClients();
  }, [search]);

  return (
    <Card className="p-3 space-y-3">
      <p className="text-sm font-medium">Sélection du client</p>
      <Input
        placeholder="Rechercher par nom ou radical..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Command className="border rounded-md max-h-64 overflow-auto mt-2">
        <CommandList>
          <CommandGroup heading="Clients">
            {clients.map((c) => (
              <CommandItem
                key={c.id}
                onSelect={() => onSelect(c)}
                className="flex justify-between"
              >
                <span>
                  {c.name} — <span className="font-mono">{c.radical}</span>
                </span>
                {c.segment && (
                  <span className="text-xs text-muted-foreground">
                    {c.segment}
                  </span>
                )}
              </CommandItem>
            ))}
            {clients.length === 0 && (
              <CommandItem disabled>Aucun client trouvé.</CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    </Card>
  );
}
