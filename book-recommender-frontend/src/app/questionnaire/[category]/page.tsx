import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { redirect } from "next/navigation";

import PageLayout from "@/components/ui/PageLayout/PageLayout";
import ContentCard from "@/components/ui/ContentCard/ContentCard";

import { fetchFromBackend } from "@/lib/backend";
import type { Questionnaire } from "@/types/questionnaire";

import QuestionnaireStepper from "./QuestionnaireStepper";

// The questionnaire is fetched per request so a content change on the backend
// shows up without redeploying the frontend.
export const dynamic = "force-dynamic";

/**
 * The copy the service worker precaches and the scoring engine scores against,
 * written by scripts/sync-offline-data.mjs.
 *
 * Read from disk rather than imported so there is exactly one copy of the
 * questionnaire in the image, and it is the same bytes the browser downloads.
 */
async function readSyncedQuestionnaire(): Promise<Questionnaire> {
  const path = join(process.cwd(), "public", "offline-data", "prose.json");

  return JSON.parse(await readFile(path, "utf8")) as Questionnaire;
}

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
    // The backend is the source of truth for the questions, but it is not
    // allowed to be the reason a tablet cannot run the test. Falling back to
    // the synced copy keeps the questionnaire working while the backend is
    // down; the answers are still recorded, queued if need be.
    console.error("Could not load questionnaire from the backend:", error);

    try {
      questionnaire = await readSyncedQuestionnaire();
    } catch (fallbackError) {
      console.error("Could not read the synced questionnaire:", fallbackError);

      return (
        <PageLayout>
          <ContentCard title="Chestionarul nu este disponibil">
            <p>Nu s-a putut încărca chestionarul. Te rugăm să încerci mai târziu.</p>
          </ContentCard>
        </PageLayout>
      );
    }
  }

  return (
    <QuestionnaireStepper questionnaire={questionnaire} category={category} />
  );
}
