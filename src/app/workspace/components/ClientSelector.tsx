"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type Client = {
  id: string;
  radical: string;
  name: string;
  segment?: string | null;
  city?: string | null;
  group_name?: string | null;
  internal_rating?: string | null;
};

type Props = {
  selected: Client | null;
  onSelect: (client: Client) => void;
};

export default function ClientSelector({ selected, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select(
          "id, radical, name, segment, city, group_name, internal_rating"
        )
        .or(
          `name.ilike.%${search}%,radical.ilike.%${search}%`
        )
        .order("name")
        .limit(30);

      if (!error && data) setClients(data as Client[]);
      setLoading(false);
    };
    load();
  }, [search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">
            Sélection du client
          </p>
          <p className="text-xs text-slate-500">
            Recherche par nom ou radical. (BD : table <code>clients</code>)
          </p>
        </div>
      </div>

      <Input
        placeholder="Rechercher par nom ou radical..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Card className="mt-2 border-slate-200">
        <Command className="max-h-64 overflow-auto">
          <CommandList>
            <CommandGroup heading="Résultats">
              {loading && (
                <CommandItem disabled>Chargement...</CommandItem>
              )}
              {!loading && clients.length === 0 && (
                <CommandItem disabled>Aucun client trouvé.</CommandItem>
              )}
              {clients.map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => onSelect(c)}
                  className="flex justify-between items-center"
                >
                  <div>
                    <div className="text-sm">
                      {c.name}{" "}
                      <span className="font-mono text-xs text-slate-500">
                        ({c.radical})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {c.city || "Ville ?"} •{" "}
                      {c.group_name ? `Groupe ${c.group_name}` : "Sans groupe"}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {c.segment || "-"} • RTG : {c.internal_rating || "-"}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </Card>

      {selected && (
        <Card className="p-3 border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Client sélectionné</p>
          <p className="text-sm font-medium text-slate-800">
            {selected.name}
          </p>
          <p className="text-[11px] text-slate-500">
            Radical :{" "}
            <span className="font-mono">{selected.radical}</span> • Segment :{" "}
            {selected.segment || "-"} • RTG : {selected.internal_rating || "-"}
          </p>
        </Card>
      )}
    </div>
  );
}
