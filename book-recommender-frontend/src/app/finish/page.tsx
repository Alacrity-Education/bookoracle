"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLayout from "@/components/ui/PageLayout/PageLayout";
import { useSession } from "@/lib/session";


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
      <main className="flex min-h-full items-center justify-center">
        <section className="w-full max-w-[700px] text-center">
          <div className="flex flex-col items-center">
            <p className="mb-3 text-[0.9rem] uppercase tracking-[0.15em]">LIRA</p>

            <h1>Mulțumim pentru participare!</h1>

            <p className="mx-auto mt-5 max-w-[560px] leading-[1.6]">
              Îți mulțumim că ai completat chestionarul. Sperăm ca recomandările
              LIRA să te ajute să descoperi următoarea ta lectură.
            </p>

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
