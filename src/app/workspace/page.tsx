"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import ClientSelector, { Client } from "./components/ClientSelector";
import ProjectList, { Project } from "./components/ProjectList";
import ScoringPanel from "./components/ScoringPanel";
import CreditTable from "./components/CreditTable";
import SummaryPanel from "./components/SummaryPanel";

export default function WorkspacePage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [lastScore, setLastScore] = useState<{
    total_score: number;
    grade: string;
    pd: number;
  } | null>(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Project Finance Scoring V5
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Workspace compact : client, projets, scoring, crédits et synthèse
              sur un seul écran.
            </p>
            {selectedClient && (
              <p className="text-xs text-slate-500 mt-1">
                Client sélectionné :{" "}
                <span className="font-medium">{selectedClient.name}</span>{" "}
                — <span className="font-mono">{selectedClient.radical}</span>
              </p>
            )}
            {selectedProject && (
              <p className="text-xs text-slate-500">
                Projet sélectionné :{" "}
                <span className="font-medium">{selectedProject.name}</span>{" "}
                ({selectedProject.project_code})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedClient(null);
                setSelectedProject(null);
                setLastScore(null);
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </div>

        <Accordion type="multiple" className="space-y-4">
          <AccordionItem value="client">
            <AccordionTrigger>1. Signalétique client</AccordionTrigger>
            <AccordionContent>
              <Card className="p-4 space-y-4 border-slate-200">
                <ClientSelector
                  selected={selectedClient}
                  onSelect={(c) => {
                    setSelectedClient(c);
                    setSelectedProject(null);
                    setLastScore(null);
                  }}
                />
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="projects">
            <AccordionTrigger disabled={!selectedClient}>
              2. Projets du client
            </AccordionTrigger>
            <AccordionContent>
              {selectedClient ? (
                <Card className="p-4 border-slate-200">
                  <ProjectList
                    client={selectedClient}
                    selected={selectedProject}
                    onSelect={setSelectedProject}
                  />
                </Card>
              ) : (
                <p className="text-xs text-slate-500">
                  Sélectionnez d&apos;abord un client.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="scoring">
            <AccordionTrigger disabled={!selectedProject}>
              3. Scoring Project Finance V5
            </AccordionTrigger>
            <AccordionContent>
              {selectedClient && selectedProject ? (
                <ScoringPanel
                  client={selectedClient}
                  project={selectedProject}
                  onScoringSaved={(res) =>
                    setLastScore({
                      total_score: res.total_score,
                      grade: res.grade,
                      pd: res.pd,
                    })
                  }
                />
              ) : (
                <p className="text-xs text-slate-500">
                  Sélectionnez un client et un projet pour accéder au scoring.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="credits">
            <AccordionTrigger disabled={!selectedProject}>
              4. Crédits &amp; financements du projet
            </AccordionTrigger>
            <AccordionContent>
              {selectedProject ? (
                <CreditTable project={selectedProject} />
              ) : (
                <p className="text-xs text-slate-500">
                  Sélectionnez un projet pour voir les crédits.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="summary">
            <AccordionTrigger disabled={!selectedProject}>
              5. Synthèse &amp; historique des évaluations
            </AccordionTrigger>
            <AccordionContent>
              {selectedClient && selectedProject ? (
                <SummaryPanel
                  client={selectedClient}
                  project={selectedProject}
                  lastScore={lastScore}
                />
              ) : (
                <p className="text-xs text-slate-500">
                  Sélectionnez un client et un projet.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
