"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

import HeaderBar from "./components/HeaderBar";
import ClientSelector from "./components/ClientSelector";
import ClientCard from "./components/ClientCard";
import ProjectList from "./components/ProjectList";
import ScoringPanel from "./components/ScoringPanel";
import CreditTable from "./components/CreditTable";
import SummaryPanel from "./components/SummaryPanel";

type Client = {
  id: string;
  name: string;
  radical: string;
  segment?: string | null;
};

type Project = {
  id: string;
  name: string;
  project_code: string;
};

export default function WorkspacePage() {
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  return (
    <div className="p-6 space-y-6">
      <HeaderBar
        client={client}
        onSaveAll={() => {
          // TODO: implémenter la sauvegarde globale si nécessaire
        }}
        onOpenHistory={() => {
          // TODO: ouvrir une popup d'historique
        }}
        onNewClient={() => {
          // TODO: ouvrir une popup de création client
        }}
      />

      <ClientSelector
        onSelect={(c) => {
          setClient(c as Client);
          setProject(null);
        }}
      />

      {client && (
        <Accordion type="multiple" className="w-full space-y-4 mt-4">
          <AccordionItem value="client">
            <AccordionTrigger>1. Signalétique Client & Groupe</AccordionTrigger>
            <AccordionContent>
              <ClientCard client={client as any} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="projects">
            <AccordionTrigger>2. Projets du Client</AccordionTrigger>
            <AccordionContent>
              <ProjectList
                client={client}
                selected={project}
                onSelect={(p) => setProject(p as Project)}
              />
            </AccordionContent>
          </AccordionItem>

          {project && (
            <>
              <AccordionItem value="scoring">
                <AccordionTrigger>
                  3. Évaluation &amp; Scoring du Projet
                </AccordionTrigger>
                <AccordionContent>
                  <ScoringPanel project={project} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="credits">
                <AccordionTrigger>
                  4. Crédits &amp; Conditions de Financement
                </AccordionTrigger>
                <AccordionContent>
                  <CreditTable project={project} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="summary">
                <AccordionTrigger>5. Synthèse &amp; Décision</AccordionTrigger>
                <AccordionContent>
                  <SummaryPanel project={project} />
                </AccordionContent>
              </AccordionItem>
            </>
          )}
        </Accordion>
      )}
    </div>
  );
}
