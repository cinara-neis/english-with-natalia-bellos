import { randomInt, randomUUID } from "node:crypto";
import catalog from "../shared/gameCatalog.json" with { type: "json" };

class GameError extends Error {
  constructor(message) { super(message); this.status = 400; }
}

export function gameConfig(game, topic = "animals", size = 12) {
  if (!["memory", "hangman", "doku", "crossword"].includes(game)) throw new GameError("Choose a game.");
  if (game === "memory") {
    if (!Object.hasOwn(catalog.memoryCategories, topic) || ![12, 16, 24].includes(size)) throw new GameError("Choose a vocabulary topic and 12, 16 or 24 cards.");
    return { game, topic, size, key: game + "-" + topic + "-" + size };
  }
  return { game, key: game };
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createRankedRun(config, now = Date.now()) {
  const run = {
    id: randomUUID(), version: 0, config, started: now, expires: now + 3600000,
    won: false, lost: false, metric: 0, message: "Your ranked round is ready.",
  };
  if (config.game === "memory") {
    const selected = shuffle(catalog.memoryCategories[config.topic].items).slice(0, config.size / 2);
    return { ...run, deck: shuffle(selected.flatMap(item => [
      { ...item, side: "word" }, { ...item, side: "picture" },
    ])), open: [], matched: [] };
  }
  if (config.game === "hangman") return { ...run, puzzle: catalog.vocabulary[randomInt(catalog.vocabulary.length)], guesses: [] };
  if (config.game === "doku") {
    const puzzle = catalog.catPuzzles[randomInt(catalog.catPuzzles.length)];
    const mirror = randomInt(2);
    const index = cell => mirror ? Math.floor(cell / 5) * 5 + 4 - cell % 5 : cell;
    return { ...run, regions: Array.from({ length: 25 }, (_, i) => puzzle.regions[index(i)]),
      solution: puzzle.solution.map(index), cats: [], marks: [], lives: 3 };
  }
  const puzzle = catalog.crosswords[randomInt(catalog.crosswords.length)];
  const answers = Array(15).fill("");
  [...puzzle.across].forEach((letter, i) => { answers[i] = letter; });
  [...puzzle.down].forEach((letter, i) => { answers[i * 5 + 2] = letter; });
  [...puzzle.bottom].forEach((letter, i) => { answers[12 + i] = letter; });
  return { ...run, puzzle, answers, incorrect: [] };
}

export function playRankedMove(previous, action, now = Date.now()) {
  if (previous.won || previous.lost || previous.expires < now) throw new GameError("This round has ended. Start a new one.");
  const run = structuredClone(previous);
  const integer = (value, max) => Number.isInteger(value) && value >= 0 && value < max;
  switch (run.config.game) {
    case "memory": {
      if (action.type === "cover" && run.open.length === 2) {
        run.open = [];
        run.message = "Try another pair.";
        break;
      }
      if (action.type !== "flip" || !integer(action.cell, run.deck.length) ||
          run.open.length === 2 || run.open.includes(action.cell) || run.matched.includes(run.deck[action.cell].word))
        throw new GameError("Choose an available card.");
      run.open.push(action.cell);
      if (run.open.length === 2) {
        run.metric++;
        const [first, second] = run.open.map(cell => run.deck[cell]);
        if (first.word === second.word && first.side !== second.side) {
          run.matched.push(first.word);
          run.open = [];
          run.message = "A match! " + first.word;
        } else run.message = "Different meanings. Turn these cards back before trying again.";
      } else run.message = "Find the matching word or picture.";
      run.won = run.matched.length === run.config.size / 2;
      break;
    }
    case "hangman": {
      if (action.type !== "guess" || typeof action.letter !== "string" ||
          !/^[A-Z]$/.test(action.letter) || run.guesses.includes(action.letter))
        throw new GameError("Choose a new letter.");
      run.guesses.push(action.letter);
      run.metric = run.guesses.filter(letter => !run.puzzle.word.includes(letter)).length;
      run.won = [...run.puzzle.word].every(letter => run.guesses.includes(letter));
      run.lost = run.metric >= 6;
      run.message = run.puzzle.word.includes(action.letter) ? "That letter is in the word." : "That letter is not in the word.";
      break;
    }
    case "doku": {
      if (!integer(action.cell, 25) || !["mark", "cat"].includes(action.type)) throw new GameError("Choose a square.");
      const cell = action.cell;
      if (run.cats.includes(cell)) throw new GameError("A cat is already here.");
      if (action.type === "mark") {
        run.marks = run.marks.includes(cell) ? run.marks.filter(value => value !== cell) : [...run.marks, cell];
        run.message = "X mark updated.";
      } else if (run.solution.includes(cell)) {
        run.cats.push(cell);
        run.marks = run.marks.filter(value => value !== cell);
        run.message = "A happy cat found its home.";
      } else {
        run.lives--;
        run.metric++;
        if (!run.marks.includes(cell)) run.marks.push(cell);
        run.message = "Wrong square. One heart lost.";
      }
      run.won = run.cats.length === 5;
      run.lost = run.lives === 0;
      break;
    }
    case "crossword": {
      if (action.type !== "solve" || !Array.isArray(action.answers) || action.answers.length !== 15 ||
          action.answers.some(value => typeof value !== "string" || !/^[A-Z]?$/.test(value)))
        throw new GameError("Enter one English letter per white square.");
      run.incorrect = run.answers.flatMap((answer, i) => answer && action.answers[i] !== answer ? [i] : []);
      run.won = run.incorrect.length === 0;
      if (!run.won) run.metric++;
      run.message = run.won ? "All three words fit!" : "Check the marked squares and try again.";
      break;
    }
  }
  run.version++;
  return run;
}

export function rankedView(run) {
  const base = {
    id: run.id, version: run.version, config: run.config, won: run.won, lost: run.lost,
    metric: run.metric, message: run.message, recorded: run.recorded || false,
  };
  if (run.config.game === "memory") return {
    ...base, cards: run.deck.map((item, i) => run.open.includes(i) || run.matched.includes(item.word) ? item : null),
    matched: run.deck.map(item => run.matched.includes(item.word)), needsCover: run.open.length === 2,
  };
  if (run.config.game === "hangman") return {
    ...base, clue: run.puzzle.clue, guesses: run.guesses,
    word: [...run.puzzle.word].map(letter => run.guesses.includes(letter) || run.lost ? letter : "_").join(" "),
    remaining: 6 - run.metric,
  };
  if (run.config.game === "doku") return { ...base, regions: run.regions, cats: run.cats, marks: run.marks, lives: run.lives };
  return { ...base, cells: run.answers.map(Boolean), clues: run.puzzle.clues, incorrect: run.incorrect };
}
