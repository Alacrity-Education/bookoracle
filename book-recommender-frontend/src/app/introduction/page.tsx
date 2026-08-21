"use client";

import { useRouter } from "next/navigation";

import { FaBookOpen, FaPenNib, FaBook } from "react-icons/fa";
import { RiTimerLine } from "react-icons/ri";
import { SiBookstack } from "react-icons/si";

import PageLayout from "@/components/ui/PageLayout/PageLayout";
import ContentCard from "@/components/ui/ContentCard/ContentCard";
import Button from "@/components/ui/Button/Button";
import SelectionCard from "@/components/ui/SelectionCard/SelectionCard";

import { questionnaireRoute } from "@/utils/routes";


export default function IntroductionPage() {
  const router = useRouter();

  return (
    <PageLayout>
      <ContentCard
        title="Ești pregătit să începi?"
        subtitle="Mai ai doar un pas până la recomandările tale personalizate."
      >
        <div className="flex flex-col gap-4">
          <p>
            Vei răspunde la <strong>20 de întrebări</strong> despre preferințele
            tale de lectură.
          </p>

          <p>
            Nu există răspunsuri corecte sau greșite. Alege varianta care te
            reprezintă cel mai bine.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-medium border border-border bg-surface p-4 text-center">
            <FaBook className="inline" /> 20 întrebări
          </div>

          <div className="rounded-medium border border-border bg-surface p-4 text-center">
            <RiTimerLine className="inline" /> Aproximativ 2-3 minute
          </div>

          <div className="rounded-medium border border-border bg-surface p-4 text-center">
            <SiBookstack className="inline" /> Recomandări personalizate
          </div>
        </div>

        <SelectionCard
          title="Proză"
          description="Descoperă romane și volume de proză potrivite preferințelor tale."
          icon={<FaBookOpen className="inline" />}
        >
          <Button onClick={() => router.push(questionnaireRoute("prose"))}>
            Începe testul
          </Button>
        </SelectionCard>

        <SelectionCard
          title="Poezie"
          description="Această secțiune va fi disponibilă într-o versiune viitoare."
          icon={<FaPenNib className="inline" />}
          disabled
        >
          <Button variant="outline" disabled>
            Disponibil în curând
          </Button>
        </SelectionCard>
      </ContentCard>
    </PageLayout>
  );
}
