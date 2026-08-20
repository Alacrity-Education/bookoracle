"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLayout from "@/components/ui/PageLayout/PageLayout";
import { useSession } from "@/lib/session";

import "./Finish.css";

export default function FinishPage() {
  const router = useRouter();
  const { clearSession } = useSession();

  useEffect(() => {
    // The run is over; drop the stored answers so a later visit starts clean
    // rather than resurrecting someone else's results on a shared machine.
    clearSession();

    const timer = setTimeout(() => {
      router.push("/");
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [router, clearSession]);

  return (
    <PageLayout>
      <main className="finish-page">
        <section className="finish-card">
          <div className="finish-content">
            <p className="finish-eyebrow">LIRA</p>

            <h1>Mulțumim pentru participare!</h1>

            <p className="finish-message">
              Îți mulțumim că ai completat chestionarul. Sperăm ca recomandările
              LIRA să te ajute să descoperi următoarea ta lectură.
            </p>

            <div className="finish-loading">
              <div className="finish-loading-track">
                <div className="finish-loading-progress" />
              </div>

              <p className="finish-loading-text">Revenim la început...</p>
            </div>
          </div>
        </section>
      </main>
    </PageLayout>
  );
}
