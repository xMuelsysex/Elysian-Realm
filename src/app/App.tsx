import { useEffect, useState } from "react";
import type { AdminStateResponse, SubmitAdminInputRequest } from "../server/admin/index.js";
import { fetchAdminState, resetAdminSimulation, stepAdminSimulation, submitAdminInput } from "./adminApi.js";
import { RealmDashboard } from "./realm/RealmDashboard.js";
import { DEFAULT_LANGUAGE, getCopy, htmlLanguage, toggleLanguage, type AppLanguage } from "./shared/i18n.js";

export function App() {
  const [language, setLanguage] = useState<AppLanguage>(DEFAULT_LANGUAGE);
  const [state, setState] = useState<AdminStateResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const copy = getCopy(language);

  useEffect(() => {
    document.documentElement.lang = htmlLanguage(language);
  }, [language]);

  useEffect(() => {
    void runCommand(() => fetchAdminState());
  }, []);

  const runCommand = async (command: () => Promise<AdminStateResponse>) => {
    setLoading(true);
    setError(undefined);
    try {
      setState(await command());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.app.unknownError);
    } finally {
      setLoading(false);
    }
  };

  const submitInput = async (input: SubmitAdminInputRequest) => {
    await runCommand(() => submitAdminInput(input));
  };

  const switchLanguage = () => setLanguage((current) => toggleLanguage(current));

  if (!state) {
    return (
      <main className="dashboard-shell">
        <section className="panel" aria-live="polite">
          <div className="top-bar">
            <div>
              <p className="eyebrow">{copy.app.eyebrow}</p>
              <h1>{copy.app.title}</h1>
            </div>
            <button type="button" className="secondary-button" aria-label={copy.language.toggleAriaLabel} onClick={switchLanguage}>
              {copy.language.toggleButton}
            </button>
          </div>
          {error ? <p className="error-banner" role="alert">{error}</p> : <p>{copy.app.loading}</p>}
        </section>
      </main>
    );
  }

  return (
    <RealmDashboard
      language={language}
      state={state}
      loading={loading}
      error={error}
      onToggleLanguage={switchLanguage}
      onStep={() => runCommand(() => stepAdminSimulation())}
      onReset={() => runCommand(() => resetAdminSimulation())}
      onSubmitInput={submitInput}
    />
  );
}
