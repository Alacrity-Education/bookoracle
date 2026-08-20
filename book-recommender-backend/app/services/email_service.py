import os
import smtplib

from email.message import EmailMessage


def send_results_email(
    to_email: str,
    profile: dict,
    recommendations: list[dict],
) -> None:

    host = os.environ["SMTP_HOST"]
    port = int(os.environ["SMTP_PORT"])
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASSWORD"]
    sender = os.environ["SMTP_FROM"]

    profile_name = profile["name"]
    profile_description = profile["description"]

    # --------------------------------------------------------
    # Plain text version
    # --------------------------------------------------------

    recommendations_text = "\n".join(
        f"{book['rank']}. {book['title']} — {book['author']}"
        for book in recommendations
    )

    text_content = f"""Bună!

Îți mulțumim că ai completat chestionarul literar LIRA.

PROFILUL TĂU LITERAR

{profile_name}

{profile_description}

CĂRȚILE RECOMANDATE

{recommendations_text}

Sperăm să găsești printre aceste recomandări următoarea ta carte preferată.

Cu drag,
Echipa LIRA
"""

    # --------------------------------------------------------
    # HTML version
    # --------------------------------------------------------

    recommendation_items = ""

    for book in recommendations:
        recommendation_items += f"""
        <li style="
            margin-bottom: 14px;
            font-size: 16px;
            line-height: 1.5;
        ">
            <strong>{book["title"]}</strong><br>
            <span style="color: #666;">
                {book["author"]}
            </span>
        </li>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html lang="ro">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport"
              content="width=device-width, initial-scale=1.0">
        <title>Rezultatele tale LIRA</title>
    </head>

    <body style="
        margin: 0;
        padding: 0;
        background-color: #f5f3ef;
        font-family: Arial, Helvetica, sans-serif;
        color: #292522;
    ">

        <div style="
            max-width: 620px;
            margin: 40px auto;
            padding: 0 20px;
        ">

            <!-- Header -->

            <div style="
                text-align: center;
                margin-bottom: 30px;
            ">
                <h1 style="
                    margin: 0;
                    font-size: 32px;
                    letter-spacing: 2px;
                ">
                    LIRA
                </h1>

                <p style="
                    margin-top: 8px;
                    color: #777;
                    font-size: 14px;
                ">
                    Profilul tău literar
                </p>
            </div>

            <!-- Profile -->

            <div style="
                background: #ffffff;
                border-radius: 12px;
                padding: 30px;
                margin-bottom: 24px;
            ">

                <p style="
                    margin: 0 0 10px 0;
                    color: #777;
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">
                    Profilul tău literar
                </p>

                <h2 style="
                    margin: 0 0 18px 0;
                    font-size: 27px;
                ">
                    {profile_name}
                </h2>

                <p style="
                    margin: 0;
                    font-size: 16px;
                    line-height: 1.7;
                    color: #4f4a46;
                ">
                    {profile_description}
                </p>

            </div>

            <!-- Recommendations -->

            <div style="
                background: #ffffff;
                border-radius: 12px;
                padding: 30px;
            ">

                <h2 style="
                    margin: 0 0 8px 0;
                    font-size: 23px;
                ">
                    Cărțile pe care ți le recomandăm
                </h2>

                <p style="
                    margin: 0 0 24px 0;
                    color: #777;
                    font-size: 15px;
                    line-height: 1.5;
                ">
                    Am ales aceste cărți pornind de la preferințele tale
                    literare.
                </p>

                <ol style="
                    margin: 0;
                    padding-left: 28px;
                ">
                    {recommendation_items}
                </ol>

            </div>

            <!-- Footer -->

            <div style="
                text-align: center;
                margin-top: 30px;
                padding-bottom: 20px;
            ">

                <p style="
                    margin: 0;
                    color: #777;
                    font-size: 13px;
                    line-height: 1.6;
                ">
                    Îți mulțumim că ai participat la LIRA.
                </p>

                <p style="
                    margin: 8px 0 0 0;
                    color: #999;
                    font-size: 12px;
                ">
                    Cu drag,<br>
                    Echipa LIRA
                </p>

            </div>

        </div>

    </body>
    </html>
    """

    # --------------------------------------------------------
    # Email
    # --------------------------------------------------------

    message = EmailMessage()

    message["From"] = sender
    message["To"] = to_email
    message["Subject"] = "Rezultatele tale LIRA"

    message.set_content(text_content)

    message.add_alternative(
        html_content,
        subtype="html",
    )

    # --------------------------------------------------------
    # SMTP
    # --------------------------------------------------------

    with smtplib.SMTP(host, port) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()

        smtp.login(user, password)

        smtp.send_message(message)