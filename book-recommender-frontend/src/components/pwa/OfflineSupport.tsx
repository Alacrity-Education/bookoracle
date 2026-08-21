"use client";

import { useEffect, useState } from "react";

import { flushQueue } from "@/lib/offlineQueue";

/**
 * Everything the app does about being offline, in one mount.
 *
 *   - registers the service worker, which is what puts the app on the device
 *   - asks it to re-sweep its cache whenever the tablet is online, so a
 *     deploy reaches an installed tablet without reinstalling it
 *   - replays participations that were queued while there was no network
 *   - tells the reader when the tablet is offline
 *
 * Rendered once from the root layout. It draws nothing while online.
 */
export default function OfflineSupport() {
  // Assume online for the first paint: the server has no way to know, and
  // rendering the banner only to remove it on hydration would flash.
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(navigator.onLine === false);

    const goOffline = () => setOffline(true);

    const goOnline = () => {
      setOffline(false);

      // Anything recorded during the outage goes out now.
      void flushQueue();
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    // A run that was queued in an earlier session is sent on the next start,
    // not only on an online event that may never fire while the app is open.
    void flushQueue();

    if (!("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          // The worker itself must never come from the HTTP cache, or a tablet
          // can be stuck on an old one for as long as its max-age.
          updateViaCache: "none",
        });

        // Installation precaches the whole app. This second sweep matters for
        // a tablet that already had the worker: it refreshes pages and assets
        // for a build that shipped since, while the network is still there.
        if (navigator.onLine) {
          (registration.active ?? navigator.serviceWorker.controller)?.postMessage({
            type: "warm-cache",
          });
        }
      } catch (error) {
        // Not fatal: the app still works, it just will not survive going
        // offline. Reported here because nothing else would say so.
        console.error("Could not register the service worker:", error);
      }
    };

    // Registration competes with the page's own requests for bandwidth, and
    // the precache sweep is not small. Let the page settle first.
    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });

      return () => window.removeEventListener("load", register);
    }
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 bg-primary px-4 py-2 text-center text-[0.85rem] text-primary-content"
    >
      Offline — testul funcționează normal, iar rezultatele se trimit când
      revine internetul.
    </div>
  );
}
