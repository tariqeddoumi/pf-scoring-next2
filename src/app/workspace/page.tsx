"use client";

import { useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import ClientTable from "./components/ClientTable";
import ProjectTable from "./components/ProjectTable";
import CreditTable from "./components/CreditTable";
import ScoringPanel from "./components/ScoringPanel";
import SummaryPanel from "./components/SummaryPanel";

import type { ClientRow, ProjectRow } from "./types";

export default function WorkspacePage() {
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);

  const ctxBadges = useMemo(() => {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={selectedClient ? "default" : "secondary"}>
          Client: {selectedClient ? selectedClient.radical : "—"}
        </Badge>
        <Badge variant={selectedProject ? "default" : "secondary"}>
          Projet: {selectedProject ? selectedProject.project_code : "—"}
        </Badge>
      </div>
    );
  }, [selectedClient, selectedProject]);

  return (
    <div className="min-h-screen">
      {/* Header compact */}
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <h1 className="truncate text-xl font-semibold">Espace de travail — PF Scoring V5</h1>
              </div>
              <p className="text-sm text-slate-600">
                Ultra compact : client → projets → scoring → crédits → synthèse
              </p>
            </div>
            {ctxBadges}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4">
        <Accordion type="multiple" defaultValue={["client", "projects", "scoring", "credits", "summary"]} className="space-y-3">

          <AccordionItem value="client" className="rounded-xl border bg-white">
            <AccordionTrigger className="px-4 py-3 text-base font-medium">
              1) Clients
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ClientTable
                selectedClient={selectedClient}
                onSelect={(c) => {
                  setSelectedClient(c);
                  setSelectedProject(null);
                }}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="projects" className="rounded-xl border bg-white">
            <AccordionTrigger className="px-4 py-3 text-base font-medium">
              2) Projets du client
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {!selectedClient ? (
                <div className="text-sm text-slate-600">Sélectionne d’abord un client.</div>
              ) : (
                <ProjectTable
                  client={selectedClient}
                  selectedProject={selectedProject}
                  onSelect={(p) => setSelectedProject(p)}
                />
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="scoring" className="rounded-xl border bg-white">
            <AccordionTrigger className="px-4 py-3 text-base font-medium">
              3) Scoring
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {!selectedProject ? (
                <div className="text-sm text-slate-600">Sélectionne un projet pour accéder au scoring.</div>
              ) : (
                <ScoringPanel project={selectedProject} />
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="credits" className="rounded-xl border bg-white">
            <AccordionTrigger className="px-4 py-3 text-base font-medium">
              4) Crédits & Financements
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {!selectedProject ? (
                <div className="text-sm text-slate-600">Sélectionne un projet pour voir les crédits.</div>
              ) : (
                <CreditTable project={selectedProject} />
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="summary" className="rounded-xl border bg-white">
            <AccordionTrigger className="px-4 py-3 text-base font-medium">
              5) Synthèse & Historique
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <SummaryPanel client={selectedClient} project={selectedProject} />
              <Separator className="mt-4" />
              <p className="mt-3 text-xs text-slate-500">
                Next: export PDF / verrouillage validation / workflow (draft → validé → archivé).
              </p>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </div>
  );
}
