"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import ProjectFormModal from "./ProjectFormModal";
import type { Client, Project } from "../page";

type Props = {
  client: Client;
  selectedProject: Project | null;
  onProjectSelected: (p: Project) => void;
};

export default function ProjectSelector({
  client,
  selectedProject,
  onProjectSelected,
}: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    setProjects((data || []) as Project[]);
  };

  useEffect(() => {
    fetchProjects();
  }, [client.id]);

  return (
    <div className="text-xs space-y-2">
      <div className="flex justify-between items-center">
        <div className="font-medium">Projets du client</div>
        <ProjectFormModal client={client} onCreated={fetchProjects} />
      </div>

      <Input
        placeholder="Filtrer par nom..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="border rounded-md max-h-48 overflow-y-auto p-1">
        {projects
          .filter((p) =>
            p.name.toLowerCase().includes(search.toLowerCase())
          )
          .map((p) => (
            <div
              key={p.id}
              className={`p-2 cursor-pointer rounded ${
                selectedProject?.id === p.id ? "bg-slate-100" : ""
              }`}
              onClick={() => onProjectSelected(p)}
            >
              <div className="font-medium text-xs">{p.name}</div>
              <div className="text-[11px] text-slate-500">
                {p.city} • {p.type}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
