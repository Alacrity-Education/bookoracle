import "./ProgressBar.css";

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
        <div className="progress">

            <div className="progress__header">

                <span>

                    Întrebarea {current} din {total}

                </span>

                <span>

                    {Math.round(progress)}%

                </span>

            </div>

            <div className="progress__track">

                <div
                    className="progress__fill"
                    style={{
                        width: `${progress}%`,
                    }}
                />

            </div>

        </div>
    );
}

export default ProgressBar;