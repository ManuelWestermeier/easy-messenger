import React from "react";

export default function Login({ handleLogin }) {
  return (
    <>
      <h1 className="opensource-info">QUATSCHER Messenger</h1>
      <fieldset className="login">
        <legend>
          <h1>Login</h1>
        </legend>
        <form onSubmit={handleLogin} className="form">
          <p>
            Password:
            <input
              type="password"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              autoFocus
              placeholder="Enter password..."
              name="password"
              className="input"
            />
          </p>
          <p id="error" className="error"></p>
          <button type="submit" className="button">
            Login
          </button>
        </form>
      </fieldset>
      <div className="opensource-info">
        <img
          src="https://manuelwestermeier.github.io/easy-messenger/img/logo-512.png"
          alt="Logo"
        />
        <h2>Open Source & Ultra Secure</h2>
        <p>
          Our messenger is designed with your security in mind. All data is
          encrypted directly on your device, ensuring that no sensitive
          information is ever sent to our servers. This open-source project is
          hosted on&nbsp;
          <a
            href="https://github.com/ManuelWestermeier/easy-messenger/"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          , making it fully transparent and, we believe, the securest messenger
          available – even governments can’t hack it!
        </p>
      </div>
      <div className="opensource-info">
        <div className="disclaimer">
          <h1>Disclaimer</h1>

          <h2>§ 1 Scope</h2>
          <p>
            By using this application, you agree that all content created,
            stored, or published by users is solely their own responsibility.
            The provider assumes no liability for such content.
          </p>

          <h2>§ 2 Limitation of Liability</h2>
          <p>
            The provider is not liable for any damages or legal consequences
            arising from the use of the application or the transmission of
            content. Any liability – whether for direct or indirect damages – is
            expressly excluded.
          </p>

          <h2>§ 3 Use at Your Own Risk</h2>
          <p>
            The use of this application is at your own risk. No guarantee is
            provided regarding the functionality or security of the application.
            The provider cannot be held responsible for any damages resulting
            from its use.
          </p>

          <h2>§ 4 Legal Advice</h2>
          <p>
            This disclaimer does not constitute legal advice. In case of doubt,
            it is recommended that you consult a legal professional.
          </p>
        </div>
        <div className="disclaimer">
          <h1>Haftungsausschluss</h1>

          <h2>§ 1 Geltungsbereich</h2>
          <p>
            Mit der Nutzung dieser Anwendung erklären Sie sich einverstanden,
            dass sämtliche Inhalte, die von Nutzern erstellt, gespeichert oder
            veröffentlicht werden, in deren eigener Verantwortung liegen. Der
            Anbieter übernimmt keinerlei Haftung für diese Inhalte.
          </p>

          <h2>§ 2 Haftungsbeschränkung</h2>
          <p>
            Der Anbieter haftet nicht für Schäden oder rechtliche Konsequenzen,
            die aus der Nutzung der Anwendung oder der Übermittlung von Inhalten
            entstehen. Jegliche Haftung – sei es für direkte oder indirekte
            Schäden – wird ausdrücklich ausgeschlossen.
          </p>

          <h2>§ 3 Nutzung auf eigene Gefahr</h2>
          <p>
            Die Nutzung der Anwendung erfolgt auf eigene Gefahr. Es wird keine
            Gewährleistung für die Funktionsfähigkeit oder die Sicherheit der
            Anwendung übernommen. Der Anbieter kann für etwaige Schäden, die aus
            der Nutzung resultieren, nicht verantwortlich gemacht werden.
          </p>

          <h2>§ 4 Rechtsberatung</h2>
          <p>
            Dieser Haftungsausschluss stellt keine Rechtsberatung dar. Im
            Zweifelsfall wird empfohlen, einen Fachanwalt zu konsultieren.
          </p>
        </div>
      </div>
    </>
  );
}
