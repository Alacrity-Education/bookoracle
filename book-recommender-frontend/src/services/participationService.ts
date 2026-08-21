import axios from "axios";

import api from "./api";
import { enqueueParticipation, markResultQueued } from "@/lib/offlineQueue";

export interface EmailRecommendation {
    rank: number;
    book_id: string;
    title: string;
    author: string;
}

export interface ParticipationCompletion {
    answers: Record<number, number>;
    destination: "email" | "finish";
    email?: string;
    newsletter?: boolean;
    profile?: {
        id: string;
        name: string;
        description: string;
    };
    recommendations?: EmailRecommendation[];
}

export interface CompletionOutcome {
    /** True when the backend could not be reached and the run was stored for later. */
    queued: boolean;
}

/** True for a request that never reached the server, as opposed to one it refused. */
function isNetworkFailure(error: unknown): boolean {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return true;
    }

    return axios.isAxiosError(error) && error.response === undefined;
}

const participationService = {
    /**
     * Records the run, and sends the result email when the reader asked for one.
     *
     * This is the last thing in the flow that needs a network, and on a tablet
     * that may not have one it must not be what stops a reader from finishing.
     * So a run that cannot be delivered is queued and replayed later, and the
     * caller is told which of the two happened.
     *
     * When the request did reach the backend and came back an error, it is
     * thrown rather than queued: retrying a completion the backend has already
     * seen would email the same reader twice.
     */
    async complete(
        category: "prose" | "poetry",
        data: ParticipationCompletion,
    ): Promise<CompletionOutcome> {
        const queue = async (): Promise<CompletionOutcome> => {
            await enqueueParticipation({
                category,
                payload: data,
                queuedAt: new Date().toISOString(),
            });

            markResultQueued();

            return { queued: true };
        };

        // Skip the request outright when the tablet knows it is offline, so the
        // reader is not left watching a spinner count down a timeout.
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            return queue();
        }

        try {
            await api.post(`/questionnaires/${category}/complete`, data);

            return { queued: false };
        } catch (error) {
            if (isNetworkFailure(error)) {
                return queue();
            }

            // No email is at stake for a run that ends without one, so a
            // backend-side failure is worth retrying rather than losing.
            if (data.destination === "finish") {
                console.warn("Backend rejected the participation; queued it.", error);

                return queue();
            }

            throw error;
        }
    },
};

export default participationService;
