interface ProgressBarProps {
    current: number;
    total: number;
}

function ProgressBar({
    current,
    total,
}: ProgressBarProps) {

    const progress = (current / total) * 100;

    return (
        <div className="flex flex-col gap-3">

            <div className="flex justify-between text-[0.95rem]">

                <span>

                    Întrebarea {current} din {total}

                </span>

                <span>

                    {Math.round(progress)}%

                </span>

            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">

                <div
                    className="h-full bg-primary transition-[width] duration-300"
                    style={{
                        width: `${progress}%`,
                    }}
                />

            </div>

        </div>
    );
}

export default ProgressBar;
