"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import PageLayout from "@/components/ui/PageLayout/PageLayout";
import ContentCard from "@/components/ui/ContentCard/ContentCard";
import Checkbox from "@/components/ui/Checkbox/Checkbox";
import Button from "@/components/ui/Button/Button";

import { ROUTES } from "@/utils/routes";
import termsText from "@/content/terms";


export default function TermsPage() {
  const router = useRouter();

  const [accepted, setAccepted] = useState(false);

  return (
    <PageLayout>
      <ContentCard
        title="Termeni și Condiții"
        subtitle="Te rugăm să citești informațiile de mai jos înainte de a continua."
      >
        <div className="flex flex-col gap-4 leading-[1.7]">
          {termsText.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        <Checkbox
          id="terms"
          checked={accepted}
          onChange={setAccepted}
          label={<>Am citit și sunt de acord cu Termenii și Condițiile.</>}
        />

        <Button disabled={!accepted} onClick={() => router.push(ROUTES.GDPR)}>
          Accept și continui
        </Button>
      </ContentCard>
    </PageLayout>
  );
}
