"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectModal } from "@/components/timesheets/create-project-modal";

export function CreateProjectEmptyState() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-dashed">
      <CreateProjectModal open={open} onClose={() => setOpen(false)} />
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold text-slate-900">Aucun chantier pour le moment</CardTitle>
        <CardDescription>
          Créez votre premier chantier pour commencer à suivre les heures et les affectations.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 pb-10 text-sm text-slate-500">
        <Button onClick={() => setOpen(true)}>Créer un chantier</Button>
        <p className="max-w-md text-center">
          Vous pourrez ensuite ajouter des ouvriers, saisir les heures quotidiennes et générer vos exports en un
          clin d&apos;œil.
        </p>
      </CardContent>
    </Card>
  );
}
