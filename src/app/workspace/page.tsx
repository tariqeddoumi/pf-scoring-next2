"use client";

import { useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ClientSelector from "./components/ClientSelector";
import ProjectList from "./components/ProjectList";
import ScoringPanel from "./components/ScoringPanel";
import CreditTable from "./components/CreditTable";
import SummaryPanel from "./components/SummaryPanel";

export type Client = {
  id: number;
  radical: string;
  name: string;
  segment?: string | null;
};

export type Project = {
  id: number;
  client_id: number;
  code: string;
  name: string;
};

export default function WorkspacePage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const resetAll = () => {
    setSelectedClient(null);
    setSelectedProject(null);
    setRefreshKey((k) => k + 1); // permet de forcer un refresh des panneaux enfants
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Project Finance Scoring V5
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Workspace compact : client, projets, scoring, crédits et synthèse sur un seul écran.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={resetAll}>
            Réinitialiser
          </Button>
        </header>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Colonne gauche : Client + Projets */}
          <div className="space-y-4 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  1. Signalétique client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ClientSelector
                  key={refreshKey}
                  selectedClient={selectedClient}
                  onClientSelected={(c) => {
                    setSelectedClient(c);
                    setSelectedProject(null);
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  2. Projets du client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedClient ? (
                  <ProjectList
                    key={selectedClient.id + "-" + refreshKey}
                    client={selectedClient}
                    selectedProject={selectedProject}
                    onProjectSelected={(p) => setSelectedProject(p)}
                  />
                ) : (
                  <p className="text-xs text-slate-500">
                    Sélectionnez d&apos;abord un client.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Scoring + Crédits + Synthèse en accordéon compact */}
          <div className="lg:col-span-2 space-y-4">
            <Accordion type="multiple" className="space-y-3">
              {/* Scoring */}
              <AccordionItem value="scoring">
                <AccordionTrigger>
                  3. Scoring Project Finance V5
                </AccordionTrigger>
                <AccordionContent>
                  <Card className="border-0 shadow-none p-0">
                    <CardContent className="px-0 pt-2 pb-0">
                      {selectedClient && selectedProject ? (
                        <ScoringPanel
                          key={selectedProject.id + "-" + refreshKey}
                          client={selectedClient}
                          project={selectedProject}
                          onScoringSaved={() => setRefreshKey((k) => k + 1)}
                        />
                      ) : (
                        <p className="text-xs text-slate-500">
                          Sélectionnez un client et un projet pour accéder au scoring.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>

              {/* Crédits */}
              <AccordionItem value="credits">
                <AccordionTrigger>
                  4. Crédits & financements du projet
                </AccordionTrigger>
                <AccordionContent>
                  <Card className="border-0 shadow-none p-0">
                    <CardContent className="px-0 pt-2 pb-0">
                      {selectedProject ? (
                        <CreditTable
                          key={selectedProject.id + "-" + refreshKey}
                          project={selectedProject}
                          onCreditsChanged={() => setRefreshKey((k) => k + 1)}
                        />
                      ) : (
                        <p className="text-xs text-slate-500">
                          Sélectionnez un projet pour voir les crédits.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>

              {/* Synthèse */}
              <AccordionItem value="summary">
                <AccordionTrigger>
                  5. Synthèse & historique des évaluations
                </AccordionTrigger>
                <AccordionContent>
                  <Card className="border-0 shadow-none p-0">
                    <CardContent className="px-0 pt-2 pb-0">
                      {selectedClient && selectedProject ? (
                        <SummaryPanel
                          key={selectedProject.id + "-" + refreshKey}
                          client={selectedClient}
                          project={selectedProject}
                        />
                      ) : (
                        <p className="text-xs text-slate-500">
                          Sélectionnez un client et un projet.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </main>
    </div>
  );
}
