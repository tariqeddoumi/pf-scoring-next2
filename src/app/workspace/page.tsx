// src/app/workspace/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import ClientTable from "./components/ClientTable";
import ProjectTable from "./components/ProjectTable";
import CreditTable from "./components/CreditTable";
import ScoringPanel from "./components/ScoringPanel";
import SummaryPanel from "./components/SummaryPanel";

import type { ClientRow, ProjectRow } from "./types";

export default function WorkspacePage() {
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(
    null
  );

  // si tu veux forcer un refresh complet: incrémente ce key
  const [refreshKey, setRefreshKey] = useState(0);

  const headerClient = useMemo(() => {
    if (!selectedClient) return "—";
    return `${selectedClient.radical ?? "—"}${
      selectedClient.name ? " · " + selectedClient.name : ""
    }`;
  }, [selectedClient]);

  const headerProject = useMemo(() => {
    if (!selectedProject) return "—";
    return `${(selectedProject.project_code ?? "—")} · ${
      selectedProject.name ?? "Projet"
    }`;
  }, [selectedProject]);

  // changement client => reset projet
  useEffect(() => {
    setSelectedProject(null);
  }, [selectedClient?.id]);

  function resetAll() {
    setSelectedClient(null);
    setSelectedProject(null);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-2xl font-bold flex items-center gap-2">
              <span>🧠</span>
              <span>Espace de travail — PF Scoring V5</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Ultra compact : client → projets → scoring → crédits → synthèse
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={selectedClient ? "default" : "secondary"}
              className="whitespace-nowrap"
            >
              Client: {headerClient}
            </Badge>
            <Badge
              variant={selectedProject ? "default" : "secondary"}
              className="whitespace-nowrap"
            >
              Projet: {headerProject}
            </Badge>
            <Button variant="outline" onClick={resetAll}>
              Réinitialiser
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        <Accordion
          type="multiple"
          defaultValue={["clients", "projects"]}
          className="space-y-3"
        >
          {/* 1) Clients */}
          <AccordionItem value="clients" className="border rounded-md">
            <AccordionTrigger className="px-3 py-2">
              1) Clients
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <ClientTable
                key={`clients-${refreshKey}`}
                selectedClient={selectedClient}
                onSelect={(c: ClientRow) => {
                  setSelectedClient(c);
                }}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 2) Projets du client */}
          <AccordionItem value="projects" className="border rounded-md">
            <AccordionTrigger className="px-3 py-2">
              2) Projets du client
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              {!selectedClient ? (
                <div className="text-sm text-muted-foreground">
                  Sélectionnez d’abord un client.
                </div>
              ) : (
                <ProjectTable
                  key={`projects-${selectedClient.id}-${refreshKey}`}
                  client={selectedClient}
                  selectedProject={selectedProject}
                  onSelect={(p: ProjectRow) => setSelectedProject(p)}
                />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 3) Scoring */}
          <AccordionItem value="scoring" className="border rounded-md">
            <AccordionTrigger className="px-3 py-2">
              3) Scoring
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              {!selectedProject ? (
                <div className="text-sm text-muted-foreground">
                  Sélectionnez un client puis un projet pour accéder au scoring.
                </div>
              ) : (
                <ScoringPanel
                  key={`scoring-${selectedProject.id}-${refreshKey}`}
                  project={selectedProject}
                />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 4) Crédits */}
          <AccordionItem value="credits" className="border rounded-md">
            <AccordionTrigger className="px-3 py-2">
              4) Crédits & Financements
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              {!selectedProject ? (
                <div className="text-sm text-muted-foreground">
                  Sélectionnez un projet pour voir/éditer les crédits.
                </div>
              ) : (
                <CreditTable
                  key={`credits-${selectedProject.id}-${refreshKey}`}
                  project={selectedProject}
                />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 5) Synthèse */}
          <AccordionItem value="summary" className="border rounded-md">
            <AccordionTrigger className="px-3 py-2">
              5) Synthèse & Historique
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              {!selectedClient || !selectedProject ? (
                <div className="text-sm text-muted-foreground">
                  Sélectionnez un client et un projet pour afficher la synthèse.
                </div>
              ) : (
                <SummaryPanel
                  key={`summary-${selectedProject.id}-${refreshKey}`}
                  client={selectedClient}
                  project={selectedProject}
                />
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
