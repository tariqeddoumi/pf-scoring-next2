"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProjectFormModal from "./ProjectFormModal";
import type { Client } from "./ClientSelector";

export type Project = {
  id: string;
  project_code: string;
  name: string;
  project_type?: string | null;
  city?: string | null;
  total_cost?: number | null;
  currency?: string | null;
  status?: string | null;
};

type Props = {
  client: Client;
  selected: Project | null;
  onSelect: (p: Project | null) => void;
};

export default function ProjectList({ client, selected, onSelect }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    if (!error && data) setProjects(data as Project[]);
  };

  useEffect(() => {
    load();
  }, [client.id]);

  const handleSaved = async () => {
    setModalOpen(false);
    setEditing(null);
    await load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-slate-800">
            Projets de {client.name}
          </p>
          <p className="text-xs text-slate-500">
            Table <code>projects</code>, filtrée sur <code>client_id</code>.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          Nouveau projet
        </Button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {projects.map((p) => {
          const isSel = selected && p.id === selected.id;
          return (
            <Card
              key={p.id}
              className={`p-3 border cursor-pointer ${
                isSel
                  ? "border-emerald-500 shadow-sm"
                  : "border-slate-200 hover:border-slate-400"
              }`}
              onClick={() => onSelect(p)}
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {p.project_code} • {p.project_type || "Type ?"}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(p);
                    setModalOpen(true);
                  }}
                >
                  ⋮
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Ville : {p.city || "-"}
              </p>
              <p className="text-[11px] text-slate-500">
                Coût total :{" "}
                {p.total_cost != null
                  ? `${p.total_cost} ${p.currency || "MAD"}`
                  : "-"}
              </p>
              <p className="text-[11px] text-slate-500">
                Statut : {p.status || "EN_ETUDE"}
              </p>
            </Card>
          );
        })}
        {projects.length === 0 && (
          <p className="text-xs text-slate-500">
            Aucun projet pour ce client. Créez un nouveau projet.
          </p>
        )}
      </div>

      <ProjectFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        clientId={client.id}
        project={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
