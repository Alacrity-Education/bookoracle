"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import PageLayout from "@/components/ui/PageLayout/PageLayout";
import { useSession } from "@/lib/session";
import { takeQueuedNotice } from "@/lib/offlineQueue";


export default function FinishPage() {
  const router = useRouter();
  const { clearSession } = useSession();

  // Set by the completion that just ran when it could not reach the backend.
  const [queued, setQueued] = useState(false);

  useEffect(() => {
    // Read after mount: sessionStorage does not exist while rendering.
    setQueued(takeQueuedNotice());
  }, []);

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
      <main className="flex min-h-full items-center justify-center">
        <section className="w-full max-w-[700px] text-center">
          <div className="flex flex-col items-center">
            <p className="mb-3 text-[0.9rem] uppercase tracking-[0.15em]">LIRA</p>

            <h1>Mulțumim pentru participare!</h1>

            <p className="mx-auto mt-5 max-w-[560px] leading-[1.6]">
              Îți mulțumim că ai completat chestionarul. Sperăm ca recomandările
              LIRA să te ajute să descoperi următoarea ta lectură.
            </p>

            {queued && (
              <p className="mx-auto mt-5 max-w-[560px] text-[0.9rem] leading-[1.6] opacity-70">
                Tableta este offline, așa că rezultatele tale au fost salvate și
                se trimit automat imediat ce revine internetul.
              </p>
            )}

            <div className="mt-12 w-full max-w-[450px]">
              <div className="h-2 w-full overflow-hidden rounded-full">
                <div className="h-full w-0 rounded-[inherit] animate-finish-progress" />
              </div>

              <p className="mt-3.5 text-[0.9rem]">Revenim la început...</p>
            </div>
          </div>
        </section>
      </main>
    </PageLayout>
  );
}
