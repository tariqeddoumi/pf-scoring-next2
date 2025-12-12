"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import ClientFormModal from "./ClientFormModal";
import type { Client } from "../page";

type Props = {
  selectedClient: Client | null;
  onClientSelected: (c: Client) => void;
};

export default function ClientSelector({
  selectedClient,
  onClientSelected,
}: Props) {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClients = async (term: string) => {
    setLoading(true);

    const query = supabase
      .from("clients")
      .select("*")
      .order("name", { ascending: true })
      .limit(50);

    if (term) query.ilike("name", `%${term}%`);

    const { data } = await query;
    setClients((data || []) as Client[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients("");
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    fetchClients(value);
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex justify-between items-center">
        <div className="font-medium">Sélection du client</div>
        <ClientFormModal onCreated={() => fetchClients(search)} />
      </div>

      <Input
        placeholder="Rechercher un client..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
      />

      <ScrollArea className="max-h-48 border rounded-md mt-2">
        <Command>
          <CommandList>
            <CommandGroup>
              {loading && <CommandItem disabled>Chargement…</CommandItem>}
              {!loading && clients.length === 0 && (
                <CommandItem disabled>Aucun client trouvé.</CommandItem>
              )}

              {clients.map((c) => {
                const active = selectedClient?.id === c.id;
                return (
                  <CommandItem
                    key={c.id}
                    onClick={() => onClientSelected(c)}
                    className={active ? "bg-slate-100" : ""}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs">{c.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {c.radical} •{" "}
                        <Badge className="text-[10px] px-1">{c.segment}</Badge>
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </ScrollArea>

      {selectedClient && (
        <div className="mt-2 bg-slate-50 border rounded p-2 text-xs">
          <div className="font-semibold">Client sélectionné</div>
          <div>{selectedClient.name}</div>
          <div className="text-slate-500">{selectedClient.radical}</div>
        </div>
      )}
    </div>
  );
}
