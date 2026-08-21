import { redirect } from "next/navigation";

import PageLayout from "@/components/ui/PageLayout/PageLayout";
import ContentCard from "@/components/ui/ContentCard/ContentCard";

import { fetchFromBackend } from "@/lib/backend";
import type { Questionnaire } from "@/types/questionnaire";

import QuestionnaireStepper from "./QuestionnaireStepper";

// The questionnaire is fetched per request so a content change on the backend
// shows up without redeploying the frontend.
export const dynamic = "force-dynamic";

export default async function QuestionnairePage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  if (category !== "prose" && category !== "poetry") {
    redirect("/");
  }

  if (category === "poetry") {
    return (
      <PageLayout>
        <ContentCard title="Poezie" subtitle="În curând">
          <p>Această secțiune este momentan în dezvoltare.</p>
        </ContentCard>
      </PageLayout>
    );
  }

  // Runs on the server, so the questions are in the initial HTML instead of
  // arriving after a client-side round trip.
  let questionnaire: Questionnaire;

  try {
    questionnaire = await fetchFromBackend<Questionnaire>(
      `questionnaires/${category}`,
    );
  } catch (error) {
    console.error("Could not load questionnaire:", error);

    return (
      <PageLayout>
        <ContentCard title="Chestionarul nu este disponibil">
          <p>Nu s-a putut încărca chestionarul. Te rugăm să încerci mai târziu.</p>
        </ContentCard>
      </PageLayout>
    );
  }

  return (
    <QuestionnaireStepper questionnaire={questionnaire} category={category} />
  );
}
