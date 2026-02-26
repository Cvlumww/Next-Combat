"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../page.module.scss";

const MIN_INITIATIVE = -5;
const STORAGE_KEY = "dm-initiative-tracker-state-v1";

const CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
];

function Modal({ title, onClose, children }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button
            onClick={onClose}
            className={styles.modalClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

let nextId = 1;

export default function DMInitiativeTrackerPage() {
  const [actors, setActors] = useState([]);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showNpcModal, setShowNpcModal] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [playerInitiative, setPlayerInitiative] = useState(0);

  const [npcName, setNpcName] = useState("");
  const [npcInitiative, setNpcInitiative] = useState(0);
  const [npcHp, setNpcHp] = useState(1);
  const [npcMultiples, setNpcMultiples] = useState(false);
  const [npcCount, setNpcCount] = useState(2);

  const [hasStarted, setHasStarted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [round, setRound] = useState(1);

  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [editingActorId, setEditingActorId] = useState(null);
  const [editInitiative, setEditInitiative] = useState(0);
  const [editHp, setEditHp] = useState(1);

  const [conditionsActorId, setConditionsActorId] = useState(null);
  const [tempConditions, setTempConditions] = useState([]);
  const [tempExhaustion, setTempExhaustion] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.actors)) return;

      setActors(parsed.actors || []);
      setHasStarted(!!parsed.hasStarted);
      if (typeof parsed.activeIndex === "number") {
        setActiveIndex(parsed.activeIndex);
      }
      if (typeof parsed.round === "number" && parsed.round >= 1) {
        setRound(parsed.round);
      }
      if (typeof parsed.nextId === "number" && parsed.nextId > 0) {
        nextId = parsed.nextId;
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't overwrite storage with empty state; keep last combat
    if (!actors.length && !hasStarted) return;

    const payload = {
      actors,
      hasStarted,
      activeIndex,
      round,
      nextId,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [actors, hasStarted, activeIndex, round]);

  useEffect(() => {
    if (!hasStarted || round <= 1) return;
    setShowConfetti(true);
    const id = setTimeout(() => setShowConfetti(false), 900);
    return () => clearTimeout(id);
  }, [round, hasStarted]);

  function trackEvent(name) {
    if (typeof window === "undefined") return;
    if (typeof window.gtag === "function") {
      window.gtag("event", name);
    } else if (window.dataLayer && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: name });
    }
  }

  function handleAddPlayer(e) {
    e.preventDefault();
    if (!playerName.trim()) return;

    const initiative = Math.max(MIN_INITIATIVE, Number(playerInitiative) || 0);

    setActors((prev) => [
      ...prev,
      {
        id: `player-${nextId++}`,
        type: "player",
        name: playerName.trim(),
        initiative,
        conditions: [],
        exhaustion: 0,
      },
    ]);

    setPlayerName("");
    setPlayerInitiative(0);
    setShowPlayerModal(false);
    trackEvent("dm_add_player");
  }

  function handleAddNpc(e) {
    e.preventDefault();
    if (!npcName.trim()) return;

    const initiative = Math.max(MIN_INITIATIVE, Number(npcInitiative) || 0);
    const hp = Math.max(1, Number(npcHp) || 1);
    const count = npcMultiples ? Math.max(1, Number(npcCount) || 1) : 1;

    const baseName = npcName.trim();
    const newActors = [];

    for (let i = 0; i < count; i++) {
      const suffix = npcMultiples ? ` ${i + 1}` : "";
      newActors.push({
        id: `npc-${nextId++}`,
        type: "npc",
        name: `${baseName}${suffix}`,
        initiative,
        hp,
        baseName,
        index: npcMultiples ? i + 1 : undefined,
        conditions: [],
      });
    }

    setActors((prev) => [...prev, ...newActors]);

    setNpcName("");
    setNpcInitiative(0);
    setNpcHp(1);
    setNpcMultiples(false);
    setNpcCount(2);
    setShowNpcModal(false);
    trackEvent("dm_add_npc");
  }

  function handleClear() {
    setActors([]);
    setHasStarted(false);
    setActiveIndex(0);
    setRound(1);
    setShowAddOptions(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    trackEvent("dm_clear_combatants");
  }

  function handleStart() {
    if (!actors.length) return;
    const sorted = [...actors].sort((a, b) => b.initiative - a.initiative);
    setActors(sorted);
    setHasStarted(true);
    setActiveIndex(0);
    setRound(1);
    setShowAddOptions(false);
    trackEvent("dm_start_initiative");
  }

  function handleNextTurn() {
    if (!hasStarted || !actors.length) return;
    setActiveIndex((prev) => {
      const next = prev + 1;
      if (next >= actors.length) {
        setRound((r) => r + 1);
        return 0;
      }
      return next;
    });
    trackEvent("dm_next_turn");
  }

  function handlePreviousTurn() {
    if (!hasStarted || !actors.length) return;
    setActiveIndex((prev) => {
      if (prev === 0) {
        // Go back a round if possible
        setRound((r) => (r > 1 ? r - 1 : 1));
        return actors.length - 1;
      }
      return prev - 1;
    });
    trackEvent("dm_previous_turn");
  }

  function toggleAddOptions() {
    setShowAddOptions((prev) => !prev);
    trackEvent("dm_toggle_add_options");
  }

  function openEndConfirm() {
    setShowEndConfirm(true);
    trackEvent("dm_end_combat_open_confirm");
  }

  function closeEndConfirm() {
    setShowEndConfirm(false);
    trackEvent("dm_end_combat_cancel");
  }

  function confirmEndCombat() {
    setShowEndConfirm(false);
    handleClear();
    trackEvent("dm_end_combat_confirm");
  }

  function handleInlineHpChange(actorId, value) {
    const hp = Math.max(0, Number(value) || 0);
    setActors((prev) =>
      prev.map((actor) =>
        actor.id === actorId && actor.type === "npc" ? { ...actor, hp } : actor,
      ),
    );
    // eslint-disable-next-line no-console
    console.log("NPC HP updated", { actorId, hp });
    trackEvent("dm_update_hp_inline");
  }

  function openEditModal(actor) {
    setEditingActorId(actor.id);
    setEditInitiative(actor.initiative);
    setEditHp(typeof actor.hp === "number" ? actor.hp : 1);
    trackEvent("dm_open_edit_actor");
  }

  function closeEditModal() {
    setEditingActorId(null);
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    if (!editingActorId) return;

    const initiative = Math.max(MIN_INITIATIVE, Number(editInitiative) || 0);
    const hp = Math.max(1, Number(editHp) || 1);

    setActors((prev) =>
      prev.map((actor) => {
        if (actor.id !== editingActorId) return actor;
        if (actor.type === "npc") {
          return { ...actor, initiative, hp };
        }
        return { ...actor, initiative };
      }),
    );

    closeEditModal();
  }

  function openConditionsModal(actor) {
    setConditionsActorId(actor.id);
    setTempConditions(actor.conditions || []);
    setTempExhaustion(actor.type === "player" ? actor.exhaustion || 0 : 0);
    trackEvent("dm_open_conditions");
  }

  function closeConditionsModal() {
    setConditionsActorId(null);
  }

  function toggleCondition(name) {
    setTempConditions((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  }

  function handleConditionsSubmit(e) {
    e.preventDefault();
    if (!conditionsActorId) return;

    const exhaustion = Math.min(7, Math.max(0, Number(tempExhaustion) || 0));

    setActors((prev) =>
      prev.map((actor) => {
        if (actor.id !== conditionsActorId) return actor;
        if (actor.type === "player") {
          return {
            ...actor,
            conditions: [...tempConditions],
            exhaustion,
          };
        }
        return {
          ...actor,
          conditions: [...tempConditions],
        };
      }),
    );

    closeConditionsModal();
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.intro}>
          <div className={styles.introBox}>
            <div>
              <h1 className={styles.introTitle}>DM Initiative Tracker</h1>
              <p className={styles.introText}>
                Quickly set up combat by adding players and NPCs, including
                large groups of identical creatures that share the same
                initiative.
              </p>
            </div>
            <div>
              {hasStarted && actors.length > 0 && (
                <>
                  <div className={styles.roundHeading}>Round {round}</div>
                  <div className={styles.panelMeta}>
                    {`${actors[activeIndex]?.name || "?"}'s Round`}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={styles.buttonRow}>
            {!hasStarted && (
              <>
                <button
                  onClick={() => setShowPlayerModal(true)}
                  className={styles.primaryButton}
                >
                  Add Player
                </button>
                <button
                  onClick={() => setShowNpcModal(true)}
                  className={styles.secondaryButton}
                >
                  Add NPC
                </button>
                <button
                  onClick={handleClear}
                  className={styles.secondaryButton}
                >
                  Clear
                </button>
              </>
            )}
            {!hasStarted && (
              <button
                onClick={handleStart}
                className={styles.primaryButton}
                disabled={!actors.length}
              >
                Start
              </button>
            )}
            {hasStarted && (
              <>
                <button
                  onClick={toggleAddOptions}
                  className={styles.secondaryButton}
                >
                  {showAddOptions ? "Hide player options" : "Add players"}
                </button>
                {showAddOptions && (
                  <>
                    <button
                      onClick={() => setShowPlayerModal(true)}
                      className={styles.primaryButton}
                    >
                      Add Player
                    </button>
                    <button
                      onClick={() => setShowNpcModal(true)}
                      className={styles.secondaryButton}
                    >
                      Add NPC
                    </button>
                  </>
                )}
                <button
                  onClick={handlePreviousTurn}
                  className={styles.secondaryButton}
                  disabled={!actors.length}
                >
                  Previous Turn
                </button>
                <button
                  onClick={handleNextTurn}
                  className={styles.primaryButton}
                  disabled={!actors.length}
                >
                  Next Turn
                </button>
                <button
                  onClick={openEndConfirm}
                  className={styles.secondaryButton}
                >
                  End Combat
                </button>
              </>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                {hasStarted ? "Turn Order" : "Pending Combatants"}
              </h2>
              <span className={styles.panelMeta}>{actors.length} entries</span>
            </div>

            {!actors.length ? (
              <p className={styles.introText}>
                No combatants yet. Add players and NPCs to begin.
              </p>
            ) : (
              <ul className={styles.actorList}>
                {actors.map((actor) => (
                  <li
                    key={actor.id}
                    className={`${styles.actorRow} ${
                      actor.type === "player"
                        ? styles.actorRowPlayer
                        : styles.actorRowNpc
                    }`}
                  >
                    <div className={styles.actorInfo}>
                      <span className={styles.actorName}>{actor.name}</span>
                      <span className={styles.actorMeta}>
                        {actor.type === "player" ? "Player" : "NPC"}
                        {actor.type === "player" &&
                        typeof actor.exhaustion === "number" &&
                        actor.exhaustion > 0
                          ? ` • Exhaustion ${actor.exhaustion}`
                          : null}
                        {actor.conditions && actor.conditions.length > 0
                          ? ` • ${actor.conditions.join(", ")}`
                          : null}
                      </span>
                    </div>
                    <div className={styles.actorControls}>
                      {actor.type === "npc" && typeof actor.hp === "number" && (
                        <input
                          type="number"
                          min={0}
                          className={styles.hpInput}
                          value={actor.hp}
                          onChange={(e) =>
                            handleInlineHpChange(actor.id, e.target.value)
                          }
                        />
                      )}
                      <span className={styles.initiativeValue}>
                        {actor.initiative >= 0 ? "+" : ""}
                        {actor.initiative}
                      </span>
                      <button
                        type="button"
                        onClick={() => openConditionsModal(actor)}
                        className={styles.chipButton}
                      >
                        Conditions
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(actor)}
                        className={styles.chipButton}
                      >
                        Edit
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.backLinkWrapper}>
            <Link href="/" className={styles.backLink}>
              ← Back to Home
            </Link>
          </div>
        </section>
      </main>

      {showPlayerModal && (
        <Modal title="Add Player" onClose={() => setShowPlayerModal(false)}>
          <form onSubmit={handleAddPlayer} className={styles.form}>
            <label className={styles.formField}>
              <span>Name</span>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                required
                className={styles.textInput}
              />
            </label>
            <label className={styles.formField}>
              <span>Initiative (min {MIN_INITIATIVE})</span>
              <input
                type="number"
                value={playerInitiative}
                onChange={(e) => setPlayerInitiative(e.target.value)}
                min={MIN_INITIATIVE}
                className={styles.numberInput}
              />
            </label>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowPlayerModal(false)}
                className={styles.secondaryButtonSmall}
              >
                Cancel
              </button>
              <button type="submit" className={styles.primaryButtonSmall}>
                Add Player
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showNpcModal && (
        <Modal title="Add NPC" onClose={() => setShowNpcModal(false)}>
          <form onSubmit={handleAddNpc} className={styles.form}>
            <label className={styles.formField}>
              <span>Name</span>
              <input
                type="text"
                value={npcName}
                onChange={(e) => setNpcName(e.target.value)}
                required
                className={styles.textInput}
              />
            </label>
            <label className={styles.formField}>
              <span>Initiative (min {MIN_INITIATIVE})</span>
              <input
                type="number"
                value={npcInitiative}
                onChange={(e) => setNpcInitiative(e.target.value)}
                min={MIN_INITIATIVE}
                className={styles.numberInput}
              />
            </label>
            <label className={styles.formField}>
              <span>HP</span>
              <input
                type="number"
                value={npcHp}
                onChange={(e) => setNpcHp(e.target.value)}
                min={1}
                className={styles.numberInput}
              />
            </label>

            <label className={styles.checkboxRow}>
              <span>Multiples</span>
              <input
                type="checkbox"
                checked={npcMultiples}
                onChange={(e) => setNpcMultiples(e.target.checked)}
              />
            </label>

            {npcMultiples && (
              <label className={styles.formField}>
                <span>Number of copies</span>
                <input
                  type="number"
                  value={npcCount}
                  onChange={(e) => setNpcCount(e.target.value)}
                  min={1}
                  className={styles.numberInput}
                />
              </label>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowNpcModal(false)}
                className={styles.secondaryButtonSmall}
              >
                Cancel
              </button>
              <button type="submit" className={styles.primaryButtonSmall}>
                Add NPC
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingActorId && (
        <Modal title="Edit Combatant" onClose={closeEditModal}>
          <form onSubmit={handleEditSubmit} className={styles.form}>
            <label className={styles.formField}>
              <span>Initiative (min {MIN_INITIATIVE})</span>
              <input
                type="number"
                value={editInitiative}
                onChange={(e) => setEditInitiative(e.target.value)}
                min={MIN_INITIATIVE}
                className={styles.numberInput}
              />
            </label>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={closeEditModal}
                className={styles.secondaryButtonSmall}
              >
                Cancel
              </button>
              <button type="submit" className={styles.primaryButtonSmall}>
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {conditionsActorId && (
        <Modal title="Conditions & Exhaustion" onClose={closeConditionsModal}>
          <form onSubmit={handleConditionsSubmit} className={styles.form}>
            <div className={styles.conditionsGrid}>
              {CONDITIONS.map((cond) => (
                <label key={cond} className={styles.conditionsItem}>
                  <input
                    type="checkbox"
                    checked={tempConditions.includes(cond)}
                    onChange={() => toggleCondition(cond)}
                  />
                  <span>{cond}</span>
                </label>
              ))}
            </div>

            {(() => {
              const actor = actors.find((a) => a.id === conditionsActorId);
              if (!actor || actor.type !== "player") return null;
              return (
                <label className={styles.formField}>
                  <span>Exhaustion (0–7)</span>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    value={tempExhaustion}
                    onChange={(e) => setTempExhaustion(e.target.value)}
                    className={styles.numberInput}
                  />
                </label>
              );
            })()}

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={closeConditionsModal}
                className={styles.secondaryButtonSmall}
              >
                Cancel
              </button>
              <button type="submit" className={styles.primaryButtonSmall}>
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showConfetti && (
        <div className={styles.confettiOverlay}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className={styles.confettiPiece} />
          ))}
        </div>
      )}

      {showEndConfirm && (
        <Modal title="End Combat" onClose={closeEndConfirm}>
          <div className={styles.form}>
            <p className={styles.introText}>
              Are you sure you want to end this combat? This will clear the
              current initiative order.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={closeEndConfirm}
                className={styles.secondaryButtonSmall}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEndCombat}
                className={styles.primaryButtonSmall}
              >
                End Combat
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
