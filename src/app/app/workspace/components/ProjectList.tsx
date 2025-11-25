"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProjectFormModal from "./ProjectFormModal";

type Project = {
  id: string;
  project_code: string;
  name: string;
  project_type?: string | null;
  city?: string | null;
  total_cost?: number | null;
  status?: string | null;
};

type Client = { id: string };

type ProjectListProps = {
  client: Client;
  selected: Project | null;
  onSelect: (project: Project | null) => void;
};

export default function ProjectList({
  client,
  selected,
  onSelect,
}: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    if (!error && data) setProjects(data as Project[]);
  };

  useEffect(() => {
    fetchProjects();
  }, [client.id]);

  const handleSaved = async () => {
    setOpenModal(false);
    setEditingProject(null);
    await fetchProjects();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">Projets du client</p>
        <Button
          size="sm"
          onClick={() => {
            setEditingProject(null);
            setOpenModal(true);
          }}
        >
          Nouveau projet
        </Button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {projects.map((p) => {
          const isSelected = selected && p.id === selected.id;
          return (
            <Card
              key={p.id}
              className={`p-3 cursor-pointer border-2 ${
                isSelected ? "border-primary" : "border-transparent"
              }`}
              onClick={() => onSelect(p)}
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.project_code} • {p.project_type || "Type ?"}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingProject(p);
                    setOpenModal(true);
                  }}
                >
                  ⋮
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ville : {p.city || "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                Coût total : {p.total_cost ?? "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                Statut : {p.status || "-"}
              </p>
            </Card>
          );
        })}
        {projects.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Aucun projet pour ce client. Créez un nouveau projet.
          </p>
        )}
      </div>

      <ProjectFormModal
        open={openModal}
        onOpenChange={setOpenModal}
        clientId={client.id}
        project={editingProject}
        onSaved={handleSaved}
      />
    </div>
  );
}
