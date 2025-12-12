"use client";

import { useState } from "react";
import ClientSelector from "./components/ClientSelector";
import ProjectSelector from "./components/ProjectSelector";
import CreditTable from "./components/CreditTable";
import ScoringPanel from "./components/ScoringPanel";

export type Client = {
  id: string;
  name: string;
  radical: string;
  segment?: string;
};

export type Project = {
  id: string;
  client_id: string;
  name: string;
  city?: string;
  type?: string;
};

export default function WorkspacePage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold">🧠 Espace de travail — PF Scoring V5</h1>

      {/* 1️⃣ Client */}
      <ClientSelector
        selectedClient={selectedClient}
        onClientSelected={(c) => {
          setSelectedClient(c);
          setSelectedProject(null); // Reset project
        }}
      />

      {/* 2️⃣ Project */}
      {selectedClient && (
        <ProjectSelector
          client={selectedClient}
          selectedProject={selectedProject}
          onProjectSelected={(p) => setSelectedProject(p)}
        />
      )}

      {/* 3️⃣ Table des crédits */}
      {selectedProject && (
        <CreditTable project={selectedProject} />
      )}

      {/* 4️⃣ Scoring */}
      {selectedProject && (
        <ScoringPanel project={selectedProject} />
      )}
    </div>
  );
}
