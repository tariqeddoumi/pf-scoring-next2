"use client";

import { useState } from "react";
import ClientTable from "./components/ClientTable";
import type { ClientRow } from "./components/ClientFormModal";
import ProjectTable from "./components/ProjectTable";
import type { ProjectRow } from "./components/ProjectFormModal";
import CreditTable from "./components/CreditTable";
import ScoringPanel from "./components/ScoringPanel";

export default function WorkspacePage() {
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
    
    <div className="p-6 bg-red-500 text-white rounded-xl">
      TEST TAILWIND
    </div>

  return (

    <div className="space-y-6 p-4 max-w-6xl mx-auto">
      <h1 className="text-xl font-bold">🧠 Espace de travail — PF Scoring V5</h1>

      <ClientTable
        selectedClient={selectedClient}
        onSelect={(c) => {
          setSelectedClient(c);
          setSelectedProject(null);
        }}
      />

      {selectedClient && (
        <ProjectTable
          client={selectedClient}
          selectedProject={selectedProject}
          onSelect={(p) => setSelectedProject(p)}
        />
      )}

      {selectedProject && <CreditTable project={selectedProject as any} />}
      {selectedProject && <ScoringPanel project={selectedProject as any} />}
    </div>
  );
}
