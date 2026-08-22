/**
 * Attribution badge, pinned to the corner of every page.
 *
 * Rendered once from the root layout rather than per page, so a new page
 * carries it without anyone remembering to add it.
 */
function AlacrityCredit() {
    return (
        <a
            href="https://alacrity.education"
            // Opens away from the app: a reader part-way through the
            // questionnaire would otherwise lose their answers to a stray tap.
            target="_blank"
            rel="noreferrer"
            className="fixed bottom-4 right-4 z-40 flex w-[7.5rem] flex-col items-center gap-1.5 rounded-medium p-2 text-center opacity-75 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 md:bottom-6 md:right-6"
        >
            {/* Empty alt: the caption below already names the link, and
                announcing the logo too would read it out twice. */}
            <img
                src="/alacrity-logo.svg"
                alt=""
                width={48}
                height={48}
                className="size-12 shrink-0"
            />

            <span className="text-[0.7rem] leading-[1.3] text-subtle">
                Realizat de Alacrity Education
            </span>
        </a>
    );
}

export default AlacrityCredit;
