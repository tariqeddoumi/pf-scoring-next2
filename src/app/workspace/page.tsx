"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import ClientTable from "./components/ClientTable";
import ProjectTable from "./components/ProjectTable";
import ScoringPanel from "./components/ScoringPanel";
import CreditTable from "./components/CreditTable";
import SummaryPanel from "./components/SummaryPanel";

import ClientFormModal from "./components/ClientFormModal";

import type { ClientRow, ProjectRow } from "./types";

export default function WorkspacePage() {
  const [selectedClient, setSelectedClient] = React.useState<ClientRow | null>(
    null
  );
  const [selectedProject, setSelectedProject] =
    React.useState<ProjectRow | null>(null);

  // Modal client
  const [openClientModal, setOpenClientModal] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<ClientRow | null>(
    null
  );

  // Accordion
  const [accValue, setAccValue] = React.useState<string>("clients");

  const clientLabel = selectedClient
    ? `${selectedClient.radical || "—"} · ${selectedClient.name || "—"}`
    : "—";

const projectLabel = selectedProject
  ? `${selectedProject.project_code ?? "—"} · ${selectedProject.name || "—"}`
  : "—";

  function resetAll() {
    setSelectedClient(null);
    setSelectedProject(null);
    setEditingClient(null);
    setOpenClientModal(false);
    setAccValue("clients");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-2xl font-semibold">
                🧠 Espace de travail — PF Scoring V5
              </div>
              <div className="text-sm text-muted-foreground">
                Ultra compact : client → projets → scoring → crédits → synthèse
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Badge variant="secondary">Client: {clientLabel}</Badge>
              <Badge variant="secondary">Projet: {projectLabel}</Badge>
              <Button variant="outline" onClick={resetAll}>
                Réinitialiser
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <Accordion
          type="single"
          collapsible
          value={accValue}
          onValueChange={(v) => setAccValue(v || "clients")}
          className="space-y-3"
        >
          {/* 1) Clients */}
          <AccordionItem value="clients" className="rounded-lg border bg-card">
            <AccordionTrigger className="px-4">1) Clients</AccordionTrigger>

            <AccordionContent className="px-4 pb-4">
              <div className="flex items-center justify-end gap-2 mb-3">
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingClient(null);
                    setOpenClientModal(true);
                  }}
                >
                  + Nouveau client
                </Button>

                {/* Optionnel: bouton “Modifier” sur client sélectionné */}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selectedClient}
                  onClick={() => {
                    if (!selectedClient) return;
                    setEditingClient(selectedClient);
                    setOpenClientModal(true);
                  }}
                >
                  Modifier
                </Button>
              </div>

              <ClientTable
                selectedClient={selectedClient}
                onSelect={(c: ClientRow) => {
                  setSelectedClient(c);
                  setSelectedProject(null);
                  setAccValue("projects");
                }}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 2) Projets */}
          <AccordionItem value="projects" className="rounded-lg border bg-card">
            <AccordionTrigger className="px-4">
              2) Projets du client
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4">
              {!selectedClient ? (
                <div className="text-sm text-muted-foreground">
                  Sélectionne d’abord un client.
                </div>
              ) : (
                <ProjectTable
                  client={selectedClient}
                  selectedProject={selectedProject}
                  onSelect={(p: ProjectRow) => {
                    setSelectedProject(p);
                    setAccValue("scoring");
                  }}
                />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 3) Scoring */}
          <AccordionItem value="scoring" className="rounded-lg border bg-card">
            <AccordionTrigger className="px-4">3) Scoring</AccordionTrigger>

            <AccordionContent className="px-4 pb-4">
              {!selectedProject ? (
                <div className="text-sm text-muted-foreground">
                  Sélectionne un projet pour accéder au scoring.
                </div>
              ) : (
                <ScoringPanel project={selectedProject} />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 4) Crédits */}
          <AccordionItem value="credits" className="rounded-lg border bg-card">
            <AccordionTrigger className="px-4">
              4) Crédits &amp; Financements
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4">
              {!selectedProject ? (
                <div className="text-sm text-muted-foreground">
                  Sélectionne un projet pour voir les crédits.
                </div>
              ) : (
                <CreditTable project={selectedProject} />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 5) Synthèse */}
          <AccordionItem value="summary" className="rounded-lg border bg-card">
            <AccordionTrigger className="px-4">
              5) Synthèse &amp; Historique
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4">
              {selectedClient && selectedProject ? (
                <SummaryPanel client={selectedClient} project={selectedProject} />
              ) : (
                <div className="text-sm text-muted-foreground">
                  Sélectionne un client et un projet pour afficher la synthèse.
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Modal */}
      <ClientFormModal
        open={openClientModal}
        onOpenChange={setOpenClientModal}
        mode={editingClient ? "edit" : "create"}
        client={editingClient}
        onSaved={() => {
          setOpenClientModal(false);
          // Optionnel : si ClientTable ne se refresh pas automatiquement
          // window.location.reload();
        }}
      />
    </div>
  );
}
