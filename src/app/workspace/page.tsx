// src/app/workspace/page.tsx
"use client";

import { useMemo, useState } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ClientRow, ProjectRow } from "./types";

import ClientTable from "./components/ClientTable";
import ProjectTable from "./components/ProjectTable";
import ScoringPanel from "./components/ScoringPanel";
import CreditTable from "./components/CreditTable";
import SummaryPanel from "./components/SummaryPanel";

export default function WorkspacePage() {
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);

  // Accordion: ultra compact, mais on ouvre automatiquement les bonnes sections quand le contexte progresse
  const defaultAccordion = useMemo(() => {
    if (!selectedClient) return ["clients"];
    if (selectedClient && !selectedProject) return ["clients", "projects"];
    return ["clients", "projects", "scoring", "credits", "summary"];
  }, [selectedClient, selectedProject]);

  // (Optionnel) état contrôlé : si tu veux laisser l’utilisateur fermer/ouvir librement, garde ceci.
  const [openItems, setOpenItems] = useState<string[]>(defaultAccordion);

  // Quand la sélection change, on “avance” l’accordéon automatiquement (sans bloquer l’utilisateur)
  useMemo(() => {
    setOpenItems((prev) => {
      const desired = defaultAccordion;
      const merged = Array.from(new Set([...prev, ...desired]));
      return merged;
    });
  }, [defaultAccordion]);

  const resetAll = () => {
    setSelectedProject(null);
    setSelectedClient(null);
    setOpenItems(["clients"]);
  };

  const clientLabel = selectedClient
    ? `${selectedClient.radical ?? "—"} · ${selectedClient.name ?? "—"}`
    : "—";


  const projectLabel = selectedProject
  ? `${(selectedProject as any).code ?? selectedProject.project_code ?? "—"} · ${selectedProject.name ?? "—"}`
  : "—";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-4">
        {/* Header ultra compact */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <div>
              <div className="text-xl font-semibold leading-tight">Espace de travail — PF Scoring V5</div>
              <div className="text-sm text-muted-foreground">
                Ultra compact : client → projets → scoring → crédits → synthèse
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <Badge variant={selectedClient ? "default" : "secondary"} className="h-7">
              Client: {clientLabel}
            </Badge>
            <Badge variant={selectedProject ? "default" : "secondary"} className="h-7">
              Projet: {projectLabel}
            </Badge>
            <Button variant="outline" className="h-7 px-2 text-xs" onClick={resetAll}>
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Layout */}
        <Card className="shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Workspace compact — toutes les opérations sur un seul écran
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            <Accordion
              type="multiple"
              value={openItems}
              onValueChange={(v) => setOpenItems(v as string[])}
              className="space-y-2"
            >
              {/* 1) Clients */}
              <AccordionItem value="clients" className="rounded-md border">
                <AccordionTrigger className="px-3 py-2 text-sm font-semibold">
                  1) Clients
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <ClientTable
                    selectedClient={selectedClient}
                    onSelect={(c) => {
                      setSelectedClient(c);
                      setSelectedProject(null);
                      setOpenItems((prev) => Array.from(new Set([...prev, "projects"])));
                    }}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* 2) Projets */}
              <AccordionItem value="projects" className="rounded-md border">
                <AccordionTrigger className="px-3 py-2 text-sm font-semibold">
                  2) Projets du client
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  {!selectedClient ? (
                    <div className="text-sm text-muted-foreground">
                      Sélectionnez d’abord un client.
                    </div>
                  ) : (
                    <ProjectTable
                      client={selectedClient}
                      selectedProject={selectedProject}
                      onSelect={(p) => {
                        setSelectedProject(p);
                        setOpenItems((prev) =>
                          Array.from(new Set([...prev, "scoring", "credits", "summary"]))
                        );
                      }}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* 3) Scoring */}
              <AccordionItem value="scoring" className="rounded-md border">
                <AccordionTrigger className="px-3 py-2 text-sm font-semibold">
                  3) Scoring
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  {!selectedProject ? (
                    <div className="text-sm text-muted-foreground">
                      Sélectionnez un projet pour accéder au scoring.
                    </div>
                  ) : (
                    <ScoringPanel project={selectedProject as any} />
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* 4) Crédits */}
              <AccordionItem value="credits" className="rounded-md border">
                <AccordionTrigger className="px-3 py-2 text-sm font-semibold">
                  4) Crédits & Financements
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  {!selectedProject ? (
                    <div className="text-sm text-muted-foreground">
                      Sélectionnez un projet pour voir/mettre à jour les crédits.
                    </div>
                  ) : (
                    <CreditTable project={selectedProject as any} />
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* 5) Synthèse */}
              <AccordionItem value="summary" className="rounded-md border">
                <AccordionTrigger className="px-3 py-2 text-sm font-semibold">
                  5) Synthèse & Historique
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  {!selectedClient || !selectedProject ? (
                    <div className="text-sm text-muted-foreground">
                      Sélectionnez un client et un projet pour afficher la synthèse.
                    </div>
                  ) : (
                    <SummaryPanel client={selectedClient} project={selectedProject} />
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
