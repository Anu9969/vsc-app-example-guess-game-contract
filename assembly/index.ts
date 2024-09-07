import { db, getEnv } from '@vsc.eco/sdk/assembly';
import { JSONDecoder, JSONEncoder, JSON } from 'assemblyscript-json/assembly';
// import {JSON} from 'json-as'

// import { sdk } from '@vsc.eco/sdk'

class GameParams {
  rounds: i64 = 3;
  currentRound: i64 = 0;
  player1: string;
  player2: string | null = null;
  player1Guess: i64 = 0;
  player2Guess: i64 = 0;
  player1Score: i64 = 0;
  player2Score: i64 = 0;

  constructor(player1: string) {
      this.player1 = player1;
  }
}

export function serializeGameParams(gameParams: GameParams): string {
  let encoder = new JSONEncoder();
  encoder.pushObject(null);

  encoder.setInteger("rounds", gameParams.rounds);
  encoder.setInteger("currentRound", gameParams.currentRound);
  encoder.setString("player1", gameParams.player1);
  encoder.setInteger("player1Score", gameParams.player1Score);
  encoder.setInteger("player2Score", gameParams.player2Score);
  encoder.setInteger("player1Guess", gameParams.player1Guess);
  encoder.setInteger("player2Guess", gameParams.player2Guess);
  if (gameParams.player2 !== null) {
    encoder.setString("player2", gameParams.player2!);
  }
  
  encoder.popObject();
  return encoder.toString();
}

export function deserializeGameParams(serialized: string): GameParams {
  const parsed = <JSON.Obj>JSON.parse(serialized);
  let gameParams = new GameParams(parsed.getString("player1")!.valueOf());
  gameParams.rounds = parsed.getInteger("rounds")!.valueOf();
  gameParams.currentRound = parsed.getInteger("currentRound")!.valueOf();
  gameParams.player1Score = parsed.getInteger("player1Score")!.valueOf();
  gameParams.player2Score = parsed.getInteger("player2Score")!.valueOf();
  gameParams.player1Guess = parsed.getInteger("player1Guess")!.valueOf();
  gameParams.player2Guess = parsed.getInteger("player2Guess")!.valueOf();
  if (parsed.getString("player2") !== null) {
    gameParams.player2 = parsed.getString("player2")!.valueOf();
  }

  return gameParams;
}

export function openGame(): void {
  const env = getEnv()
  const gameParams = new GameParams(env.msg_sender);
  const serialized = serializeGameParams(gameParams);
  db.setObject(`game_params`, serialized);
}

export function joinGame(): void {
  const currentGame = db.getObject(`game_params`);
  if (currentGame !== "null") {
    const env = getEnv()
    const game = deserializeGameParams(currentGame);
    game.player2 = env.msg_sender;
    const serialized = serializeGameParams(game);
    db.setObject(`game_params`, serialized);
  } else {
    throw new Error('No game found, please initialize a game first.');
  }
}

export function resetGame(): void {
  db.setObject(`game_params`, "null");
  db.setObject(`winner`, "null");
  db.setObject(`last_random_number`, "null");
}

export function calcAbsDiff(a: i64, b: i64): i64 {
  if (a > b) {
    return a - b;
  } else {
    return b - a;
  }
}

function mapValue(value: f64, fromMin: f64, fromMax: f64, toMin: f64, toMax: f64): f64 {
  return (value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin;
}
 
function convertCharToRange(charCode: u8): i64 {
  let mappedValue = mapValue(charCode, 0, 255, 1, 100);
  return <i64>mappedValue;
}

export function saveString(key: string, value: string): void {
  let encoder = new JSONEncoder();
  encoder.pushObject(null);
  encoder.setString(key, value);
  encoder.popObject();
  db.setObject(key, encoder.toString());
}

export function getString(key: string): string {
  const value = db.getObject(key);
  const parsed = <JSON.Obj>JSON.parse(value)
  return parsed.getString(key)!.valueOf();
}

export function play(guess: string): void {
  const currentGame = db.getObject(`game_params`);
  if (currentGame !== "null") {
    const env = getEnv()
    const game = deserializeGameParams(currentGame);

    if (game.player1 !== env.msg_sender && game.player2 !== env.msg_sender) {
      throw new Error('You are not a player in this game.');
    }
    if (game.player2 === null) {
      throw new Error('Player 2 not joined yet.');
    }
    if (game.player1 === env.msg_sender) {
      game.player1Guess = <i64>parseInt(guess);
    }
    if (game.player2 === env.msg_sender) {
      game.player2Guess = <i64>parseInt(guess);
    }

    if (game.player1Guess !== 0 && game.player2Guess !== 0) {
      // using anchor_id as random number
      const randomNumber: i64 = convertCharToRange(<u8>env.anchor_id.charCodeAt(58));
      saveString('last_random_number', randomNumber.toString());
      if (calcAbsDiff(game.player1Guess!, randomNumber) < calcAbsDiff(game.player2Guess!, randomNumber)) {
        game.player1Score += 1;
      } else {
        game.player2Score += 1;
      }

      game.currentRound += 1;
      if (game.currentRound.toString() == game.rounds.toString()) {
        if (game.player1Score > game.player2Score) {
          saveString('winner', game.player1! + ':' + game.player1Score.toString());
        } else {
          saveString('winner', game.player2! + ':' + game.player2Score.toString());
        }
      }
      
      game.player1Guess = 0;
      game.player2Guess = 0;
    }

    const serialized = serializeGameParams(game);
    db.setObject(`game_params`, serialized);
  } else {
    throw new Error('No game found, please initialize a game first.');
  }
}