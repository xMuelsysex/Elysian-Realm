import { useState, type FormEvent } from "react";
import type { SubmitAdminInputRequest } from "../../server/admin/index.js";
import type { WorldSnapshot } from "../../shared/contracts/index.js";
import type { AppLanguage } from "../shared/i18n.js";
import { getCopy } from "../shared/i18n.js";

interface InterventionPanelProps {
  language: AppLanguage;
  disabled: boolean;
  snapshot: WorldSnapshot;
  onStep: () => Promise<void>;
  onReset: () => Promise<void>;
  onSubmit: (input: SubmitAdminInputRequest) => Promise<void>;
}

type FormErrorKey = keyof ReturnType<typeof getCopy>["controls"]["errors"];

const DEFAULT_REALM_EVENT_KIND = "debug.realmEvent";

export function InterventionPanel({ language, disabled, snapshot, onStep, onReset, onSubmit }: InterventionPanelProps) {
  const copy = getCopy(language);
  const [timeScale, setTimeScale] = useState(String(snapshot.timeScale));
  const [realmTargetId, setRealmTargetId] = useState(snapshot.id);
  const [realmEventKind, setRealmEventKind] = useState(DEFAULT_REALM_EVENT_KIND);
  const [realmDescription, setRealmDescription] = useState("");
  const [messageTargetId, setMessageTargetId] = useState(snapshot.agents[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<FormErrorKey>();

  const submitObserverCommand = async (action: "pause" | "resume") => {
    setFormError(undefined);
    await onSubmit({
      kind: "observerCommand",
      targetIds: [snapshot.id],
      payload: { action },
      source: "user",
    });
  };

  const submitTimeScale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    const nextTimeScale = Number(timeScale);
    if (!Number.isFinite(nextTimeScale) || nextTimeScale <= 0) {
      setFormError("timeScale");
      return;
    }
    await onSubmit({
      kind: "observerCommand",
      targetIds: [snapshot.id],
      payload: { action: "setTimeScale", timeScale: nextTimeScale },
      source: "user",
    });
  };

  const submitRealmEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    if (!realmTargetId.trim()) {
      setFormError("realmTarget");
      return;
    }
    if (!realmEventKind.trim()) {
      setFormError("realmKind");
      return;
    }
    await onSubmit({
      kind: "realmEvent",
      targetIds: [realmTargetId],
      payload: {
        eventKind: realmEventKind.trim(),
        description: realmDescription.trim() || copy.controls.defaultRealmDescription,
      },
      source: "user",
    });
    setRealmDescription("");
  };

  const submitDirectMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    if (!messageTargetId.trim()) {
      setFormError("messageTarget");
      return;
    }
    if (!message.trim()) {
      setFormError("message");
      return;
    }
    await onSubmit({
      kind: "directPrivateMessage",
      targetIds: [messageTargetId],
      payload: { message: message.trim() },
      source: "user",
    });
    setMessage("");
  };

  return (
    <section className="panel control-panel" aria-labelledby="controls-heading">
      <div className="panel-heading">
        <p className="eyebrow">{copy.controls.eyebrow}</p>
        <h2 id="controls-heading">{copy.controls.title}</h2>
      </div>

      {formError ? <p className="form-error" role="alert">{copy.controls.errors[formError]}</p> : null}

      <div className="button-row" aria-label={copy.controls.simulationControls}>
        <button type="button" disabled={disabled} onClick={onStep}>{copy.controls.step}</button>
        <button type="button" disabled={disabled} onClick={() => void submitObserverCommand("pause")}>{copy.controls.pause}</button>
        <button type="button" disabled={disabled} onClick={() => void submitObserverCommand("resume")}>{copy.controls.resume}</button>
        <button type="button" className="danger-button" disabled={disabled} onClick={onReset}>{copy.controls.reset}</button>
      </div>

      <form className="stacked-form" onSubmit={submitTimeScale}>
        <label htmlFor="time-scale">{copy.controls.setTimeScale}</label>
        <div className="inline-form-row">
          <input
            id="time-scale"
            type="number"
            min="0.1"
            step="0.1"
            value={timeScale}
            disabled={disabled}
            onChange={(event) => setTimeScale(event.target.value)}
          />
          <button type="submit" disabled={disabled}>{copy.controls.apply}</button>
        </div>
      </form>

      <form className="stacked-form" onSubmit={submitRealmEvent}>
        <h3>{copy.controls.realmEvent}</h3>
        <label htmlFor="realm-target">{copy.controls.target}</label>
        <select id="realm-target" value={realmTargetId} disabled={disabled} onChange={(event) => setRealmTargetId(event.target.value)}>
          <option value={snapshot.id}>{snapshot.id} ({copy.controls.worldTarget})</option>
          {snapshot.locations.map((location) => (
            <option key={location.id} value={location.id}>{location.displayName} ({location.id})</option>
          ))}
          {snapshot.agents.map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.displayName} ({agent.id})</option>
          ))}
        </select>
        <label htmlFor="realm-kind">{copy.controls.eventKind}</label>
        <input id="realm-kind" value={realmEventKind} disabled={disabled} onChange={(event) => setRealmEventKind(event.target.value)} />
        <label htmlFor="realm-description">{copy.controls.description}</label>
        <textarea
          id="realm-description"
          rows={3}
          value={realmDescription}
          disabled={disabled}
          onChange={(event) => setRealmDescription(event.target.value)}
        />
        <button type="submit" disabled={disabled}>{copy.controls.submitRealmEvent}</button>
      </form>

      <form className="stacked-form" onSubmit={submitDirectMessage}>
        <h3>{copy.controls.directMessage}</h3>
        <label htmlFor="message-target">{copy.controls.agent}</label>
        <select id="message-target" value={messageTargetId} disabled={disabled} onChange={(event) => setMessageTargetId(event.target.value)}>
          {snapshot.agents.map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.displayName} ({agent.id})</option>
          ))}
        </select>
        <label htmlFor="private-message">{copy.controls.message}</label>
        <textarea
          id="private-message"
          rows={3}
          value={message}
          disabled={disabled}
          onChange={(event) => setMessage(event.target.value)}
        />
        <button type="submit" disabled={disabled}>{copy.controls.sendMessage}</button>
      </form>
    </section>
  );
}
