import { useEffect, useState } from "react";
import styled from "styled-components";
import { communityBase, communityRequest } from "../../community";
import * as S from "../../styles";
import { Actions, GamePanel } from "./styles";
import { memoryCategories } from "./memoryWords";
import RankedRound from "./RankedRound";
import { rankingGames, type PlayerIdentity, type RankedRun, type RankingConfig, type RankingEntry, type RankingGroup } from "./rankingTypes";

const request = <T,>(route: string, body: unknown = {}, token = ""): Promise<T> =>
  communityRequest("/ranking" + route, body, token);

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: .5rem 1rem;
  > div { flex: 1 1 10rem; }
`;
const TableWrap = styled.div`
  width: 100%;
  overflow-x: auto;
  table { width: 100%; border-collapse: collapse; font-size: .9rem; }
  th, td { padding: .65rem; text-align: left; border-bottom: 1px solid #d9cfc2; }
  th { font-weight: 600; }
  caption { text-align: left; font: 1.5rem "Cormorant Garamond", Georgia, serif; margin-bottom: .6rem; }
`;

export default function Rankings({ studentSession }: { studentSession?: string }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [retry, setRetry] = useState(0);
  const [cohort, setCohort] = useState<RankingGroup>("students");
  const [config, setConfig] = useState<RankingConfig>({ game: "memory", topic: "animals", size: 12 });
  const [rows, setRows] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [player, setPlayer] = useState<PlayerIdentity>();
  const [nickname, setNickname] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [run, setRun] = useState<RankedRun>();
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let current = true;
    if (!communityBase) { setAvailable(false); return; }
    request<{ available: boolean }>("/status")
      .then(result => { if (current) setAvailable(result.available); })
      .catch(() => { if (current) setAvailable(false); });
    return () => { current = false; };
  }, [retry]);

  useEffect(() => {
    if (available !== true) return;
    let current = true;
    setLoading(true);
    setRows([]);
    setError("");
    request<{ rows: RankingEntry[] }>("/board", { ...config, cohort })
      .then(result => { if (current) setRows(result.rows); })
      .catch(e => { if (current) setError(e.message); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [available, cohort, config, refresh]);

  useEffect(() => {
    if (player?.cohort === "students" && player.session !== studentSession) {
      setPlayer(undefined); setRun(undefined);
    }
  }, [studentSession, player]);

  async function work(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not complete the ranking request."); }
    finally { setBusy(false); }
  }

  function choose(next: RankingConfig) {
    setConfig(next); setRun(undefined); setError("");
  }

  async function move(action: Record<string, unknown>) {
    if (!run || !player) return;
    await work(async () => {
      const result = await request<RankedRun>("/move", { id: run.id, version: run.version, action }, player.session);
      setRun(result);
      if (result.won) setRefresh(value => value + 1);
    });
  }

  const label = rankingGames.find(game => game.id === config.game)!;

  return <GamePanel aria-labelledby="ranking-heading">
    <h2 id="ranking-heading">Leaderboard</h2>
    <p>Join with a public nickname. Students and visitor players have separate rankings. Your login details stay private.</p>
    {available === null ? <p role="status">Connecting to the ranking…</p> : available === false ? <>
      <S.Notice>Online rankings are not available on this site yet. You can keep practising in the free games.</S.Notice>
      <S.Button type="button" $secondary onClick={() => { setAvailable(null); setRetry(value => value + 1); }}>Check connection again</S.Button>
    </> : <>
      <fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0 }}>
        <S.ScreenReaderOnly as="legend">Ranking settings</S.ScreenReaderOnly>
        <Filters>
          <div><label htmlFor="ranking-group">Ranking group</label>
            <select id="ranking-group" value={cohort} onChange={event => setCohort(event.target.value as RankingGroup)}>
              <option value="students">Students</option><option value="visitors">Visitors</option>
            </select>
          </div>
          <div><label htmlFor="ranking-game">Game</label>
            <select id="ranking-game" value={config.game} onChange={event => choose({ game: event.target.value as RankingConfig["game"], topic: "animals", size: 12 })}>
              {rankingGames.map(game => <option key={game.id} value={game.id}>{game.label}</option>)}
            </select>
          </div>
          {config.game === "memory" && <>
            <div><label htmlFor="ranking-topic">Memory topic</label>
              <select id="ranking-topic" value={config.topic} onChange={event => choose({ ...config, topic: event.target.value })}>
                {Object.entries(memoryCategories).map(([id, category]) => <option key={id} value={id}>{category.label}</option>)}
              </select>
            </div>
            <div><label htmlFor="ranking-size">Ranked cards</label>
              <select id="ranking-size" value={config.size} onChange={event => choose({ ...config, size: Number(event.target.value) })}>
                {[12, 16, 24].map(size => <option key={size} value={size}>{size} cards</option>)}
              </select>
            </div>
          </>}
        </Filters>
      </fieldset>
      <p><small>Every completed ranked round counts once. Memory topics and board sizes have their own rankings. Ties use the best result, then the time for that result.</small></p>
      {loading ? <p role="status">Loading records…</p> : rows.length ? <TableWrap>
        <table>
          <caption>{cohort === "students" ? "Students" : "Visitors"} · {label.label}</caption>
          <thead><tr><th scope="col">Place</th><th scope="col">Nickname</th><th scope="col">Wins</th><th scope="col">{label.metric}</th><th scope="col">Best time</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={row.nickname}>
            <td>{index + 1}</td><th scope="row">{row.nickname}</th><td>{row.wins}</td><td>{row.best}</td><td>{(row.milliseconds / 1000).toFixed(2)} s</td>
          </tr>)}</tbody>
        </table>
      </TableWrap> : <S.Notice>No records for this group and challenge yet.</S.Notice>}

      <h3 style={{ marginTop: "2rem" }}>{player ? "Your player account" : "Join the ranking"}</h3>
      {!player ? <>
        {studentSession ? <S.Button type="button" disabled={busy} onClick={() => void work(async () => {
          const result = await request<Omit<PlayerIdentity, "session">>("/me", {}, studentSession);
          setPlayer({ ...result, session: studentSession }); setNickname(result.nickname); setCohort("students");
        })}>Use my student account</S.Button> : <p>Students can <a href="#/student-login">sign in with their student account</a>.</p>}
        <details>
          <summary>{creating ? "Create a visitor player account" : "Visitor player sign-in"}</summary>
          <p>Visitor accounts let you join games and rankings. Choose a unique username and keep your password safely. Password recovery for visitor players is not available yet.</p>
          <form onSubmit={event => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            void work(async () => {
              const result = await request<PlayerIdentity>(creating ? "/register" : "/login", {
                username: fields.get("username"), password: fields.get("password"),
                nickname: fields.get("nickname"), consent: fields.get("consent") === "on",
              });
              setPlayer(result); setNickname(result.nickname); setCohort("visitors");
            });
          }}>
            <fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0 }}>
              <S.ScreenReaderOnly as="legend">Visitor player account</S.ScreenReaderOnly>
              <label htmlFor="player-username">Player username</label>
              <input id="player-username" name="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{2,23}" autoComplete="username" />
              {creating && <>
                <label htmlFor="visitor-nickname">Public nickname</label>
                <input id="visitor-nickname" name="nickname" required minLength={2} maxLength={32} />
              </>}
              <label htmlFor="player-password">Player password</label>
              <input id="player-password" name="password" type="password" required minLength={12} maxLength={256} autoComplete={creating ? "new-password" : "current-password"} />
              {creating && <label style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                <input type="checkbox" name="consent" required style={{ width: 22 }} /> I want my nickname and records to appear in the public visitor ranking.
              </label>}
              <Actions>
                <S.Button>{busy ? "Please wait…" : creating ? "Create player account" : "Sign in as visitor player"}</S.Button>
                <S.Button type="button" $secondary onClick={() => { setCreating(value => !value); setError(""); }}>{creating ? "I have an account" : "Create visitor account"}</S.Button>
              </Actions>
            </fieldset>
          </form>
        </details>
      </> : <>
        <p>Signed in{player.nickname ? " as " + player.nickname : ""} · {player.cohort === "students" ? "Student ranking" : "Visitor ranking"}.</p>
        {!player.enabled ? <form onSubmit={event => {
          event.preventDefault();
          void work(async () => {
            const result = await request<Omit<PlayerIdentity, "session">>("/profile", { nickname, enabled: true }, player.session);
            setPlayer({ ...result, session: player.session }); setRefresh(value => value + 1);
          });
        }}>
          <label htmlFor="ranking-nickname">Choose your public nickname</label>
          <input id="ranking-nickname" value={nickname} required minLength={2} maxLength={32} disabled={busy} onChange={event => setNickname(event.target.value)} />
          <label style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
            <input type="checkbox" required style={{ width: 22 }} /> Show my nickname and game records in my group’s public ranking.
          </label>
          <S.Button disabled={busy}>Join with this nickname</S.Button>
        </form> : <>
          <p>Start a ranked round here to register a record. Choose the game above, then start a ranked round to count your result.</p>
          <Actions>
            <S.Button type="button" disabled={busy} onClick={() => void work(async () => {
              setRun(await request<RankedRun>("/start", config, player.session));
              setCohort(player.cohort);
            })}>Start ranked round</S.Button>
            <S.Button type="button" $secondary disabled={busy} onClick={() => void work(async () => {
              await request("/profile", { nickname: player.nickname, enabled: false }, player.session);
              setPlayer({ ...player, enabled: false }); setRun(undefined); setRefresh(value => value + 1);
            })}>Hide my ranking</S.Button>
          </Actions>
        </>}
        <S.Button type="button" $secondary disabled={busy} onClick={() => void work(async () => {
          try {
            if (player.cohort === "visitors") await request("/logout", {}, player.session);
          } finally {
            setPlayer(undefined); setRun(undefined);
          }
        })}>Leave player account</S.Button>
      </>}
      {player && run && <>
        <h3 style={{ marginTop: "2rem" }}>Ranked {rankingGames.find(game => game.id === run.config.game)?.label}</h3>
        <RankedRound key={run.id} run={run} busy={busy} onMove={action => void move(action)} />
        <S.Button type="button" $secondary disabled={busy} onClick={() => void work(async () => {
          const current = await request<RankedRun>("/current", {}, player.session);
          setRun(current);
          if (current.won) setRefresh(value => value + 1);
        })}>Refresh round</S.Button>
      </>}
    </>}
    {error && <S.Notice $error role="alert">{error}</S.Notice>}
  </GamePanel>;
}
