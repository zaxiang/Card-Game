import { createServer } from "http";
import { Server } from "socket.io";
import {
  Action,
  createEmptyGame,
  doAction,
  filterCardsForPlayerPerspective,
  Card,
  computePlayerCardCounts,
  Config
} from "./model";
import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import pino from "pino";
import expressPinoLogger from "express-pino-logger";
import { Collection, Db, MongoClient, ObjectId } from "mongodb";
import session from "express-session";
import MongoStore from "connect-mongo";
import { Issuer, Strategy, generators } from "openid-client";
import passport from "passport";
import { Strategy as CustomStrategy } from "passport-custom"
import { gitlab } from "./secrets";

//added for DISABLE_SECURITY
const DISABLE_SECURITY = process.env.DISABLE_SECURITY
const passportStrategies = [
  ...(DISABLE_SECURITY ? ["disable-security"] : []),
  "oidc",
]

// set up Mongo
const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUrl);
let db: Db;
let gameConfig: Collection<Config>

// set up Express
const app = express();
const server = createServer(app);
const port = parseInt(process.env.PORT) || 8228;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// set up Pino logging
const logger = pino({
  transport: {
    target: "pino-pretty",
  },
});
app.use(expressPinoLogger({ logger }));

// set up CORS
// app.use(cors({
//   origin: "http://localhost:" + port,
//   credentials: true,
// }))

// set up session
const sessionMiddleware = session({
  secret: "a just so-so secret",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },

  store: MongoStore.create({
    mongoUrl: "mongodb://127.0.0.1:27017",
    ttl: 14 * 24 * 60 * 60, // 14 days
  }),
});
app.use(sessionMiddleware);
declare module "express-session" {
  export interface SessionData {
    credits?: number;
  }
}

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => {
  console.log("serializeUser", user);
  done(null, user);
});
passport.deserializeUser((user, done) => {
  console.log("deserializeUser", user);
  done(null, user);
});

// set up Socket.IO
const io = new Server(server);

// convert a connect middleware to a Socket.IO middleware
const wrap = (middleware: any) => (socket: any, next: any) =>
  middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

// hard-coded game configuration
const playerUserIds = ["zx122", "user1", "user2"];
// let gameState = createEmptyGame(playerUserIds, 1, 10);
let gameState = createEmptyGame(playerUserIds, 5, 13, 4, "Q")


//added functionality for dynamic configuration (form)
// let gameConfig: Config = {
//   numberOfDecks: 5,
//   rankLimit: 13,
//   suitLimit: 4,
//   wildCard: "Q",
// };

function emitUpdatedCardsForPlayers(cards: Card[], newGame = false) {
  gameState.playerNames.forEach((_, i) => {
    let updatedCardsFromPlayerPerspective = filterCardsForPlayerPerspective(
      cards,
      i
    );
    if (newGame) {
      updatedCardsFromPlayerPerspective =
        updatedCardsFromPlayerPerspective.filter(
          (card) => card.locationType !== "unused"
        );
    }
    console.log(
      "emitting update for player",
      i,
      ":",
      updatedCardsFromPlayerPerspective
    );
    io.to(String(i)).emit(
      newGame ? "all-cards" : "updated-cards",
      updatedCardsFromPlayerPerspective
    );
  });
}

io.on("connection", (client) => {
  const user = (client.request as any).session?.passport?.user;
  logger.info("new socket connection for user " + JSON.stringify(user));
  if (!user) {
    client.disconnect();
    return;
  }

  function emitGameState() {
    client.emit(
      "game-state",
      playerIndex,
      gameState.playerNames.filter((_, i) => computePlayerCardCounts(gameState)[i] <= 1),
      gameState.currentTurnPlayerIndex,
      gameState.phase,
      gameState.playCount,
      gameState.wildCard
    );
  }

  console.log("New client");
  let playerIndex: number | "all" = playerUserIds.indexOf(
    user.preferred_username
  );
  // if (playerIndex === -1) {
  //   playerIndex = "all";
  // }
  client.join(String(playerIndex));

  if (typeof playerIndex === "number") {
    client.emit(
      "all-cards",
      filterCardsForPlayerPerspective(
        Object.values(gameState.cardsById),
        playerIndex
      ).filter((card) => card.locationType !== "unused")
    );
  } else {
    client.emit("all-cards", Object.values(gameState.cardsById));
  }
  emitGameState();

  client.on("action", async (action: Action) => {
    if (typeof playerIndex === "number") {
      const config = await gameConfig.findOne({configurationId: "default"});
      if (config) {
        // Game configuration found, use it
        const updatedCards = doAction(gameState, { ...action, playerIndex }, config.wildCard);
        emitUpdatedCardsForPlayers(updatedCards);
      } else {
        // No game configuration found, handle accordingly
        console.log("In Action: No game configuration found with configurationID 'default'");
      }
      // const updatedCards = doAction(gameState, { ...action, playerIndex }, gameConfig.wildCard);
      // emitUpdatedCardsForPlayers(updatedCards);
    } else {
      // no actions allowed from "all"
    }
    io.to("all").emit("updated-cards", Object.values(gameState.cardsById));
    io.emit(
      "game-state",
      null,
      gameState.playerNames.filter((_, i) => computePlayerCardCounts(gameState)[i] <= 1),
      gameState.currentTurnPlayerIndex,
      gameState.phase,
      gameState.playCount,
      gameState.wildCard
    );
  });

  client.on("new-game", async () => {
    console.log("New game event received on the server");
    const config = await gameConfig.findOne({configurationId: "default"});
      if (config) {
        gameState = createEmptyGame(gameState.playerNames, config.numberOfDecks, config.rankLimit, config.suitLimit, config.wildCard)
        const updatedCards = Object.values(gameState.cardsById);
        emitUpdatedCardsForPlayers(updatedCards, true);
        io.to("all").emit("all-cards", updatedCards);
      } else {
        console.log("In new-game: No game configuration found with configurationID 'default'");
      }
    
    // gameState = createEmptyGame(gameState.playerNames, gameConfig.numberOfDecks, gameConfig.rankLimit, gameConfig.suitLimit, gameConfig.wildCard)
    // const updatedCards = Object.values(gameState.cardsById);
    // emitUpdatedCardsForPlayers(updatedCards, true);
    // io.to("all").emit("all-cards", updatedCards);
    io.emit(
      "game-state",
      playerIndex,
      gameState.playerNames.filter((_, i) => computePlayerCardCounts(gameState)[i] <= 1),
      gameState.currentTurnPlayerIndex,
      gameState.phase,
      gameState.playCount,
      gameState.wildCard
    );
  });


  //added functionalities for dynamic configuration
  client.on("get-config", async () => {
    //client.emit("get-config-reply", gameConfig);
    const config = await gameConfig.findOne({ configurationId: "default" });
    if (config) {
      client.emit("get-config-reply", config);
    } else {
      console.log("In get-config: No game configuration found with configurationID 'default'");
    }
  });

  client.on("update-config", async (newConfig: Config) => {
    console.log("server side: update-config");
    // Perform type and field checks on the new configuration
    const isValidConfig = typeof newConfig === "object"
      && typeof newConfig.numberOfDecks === "number"
      && typeof newConfig.rankLimit === "number"
      && typeof newConfig.suitLimit === "number"
      && typeof newConfig.wildCard === "string";
    // Check for extra fields
    // const hasExtraFields = Object.keys(newConfig).length !== 4;

    if (!isValidConfig) {
      // Invalid configuration, send update-config-reply with false
      client.emit("update-config-reply", false);
      console.log("server side: false update-config-reply");
    } else {

      // Update the game configuration in the database
      const result = await gameConfig.updateOne(
        { configurationId: "default" },
        {
          $set: { ...newConfig}
        }
      );

      if (result.modifiedCount === 0 && result.upsertedCount === 0) {
        // No existing document was modified and no new document was inserted
        console.log("In update-config: Failed to update game configuration.");
        client.emit("update-config-reply", false);
        return;
      }


      // Valid configuration, wait for 2 seconds and send update-config-reply with true
      setTimeout( async () => {
        // gameConfig.numberOfDecks = newConfig.numberOfDecks;
        // gameConfig.rankLimit = newConfig.rankLimit;
        // gameConfig.suitLimit = newConfig.suitLimit;
        // gameConfig.wildCard = newConfig.wildCard;
        
        // Perform actions needed for a new game like the new-game above
        gameState = createEmptyGame(gameState.playerNames, newConfig.numberOfDecks, newConfig.rankLimit, newConfig.suitLimit, newConfig.wildCard);
        const updatedCards = Object.values(gameState.cardsById);
        emitUpdatedCardsForPlayers(updatedCards, true);
        io.to("all").emit(
          "all-cards",
          updatedCards
        )
        io.emit(
          "game-state",
          playerIndex,
          gameState.playerNames.filter((_, i) => computePlayerCardCounts(gameState)[i] <= 1),
          gameState.currentTurnPlayerIndex,
          gameState.phase,
          gameState.playCount,
          gameState.wildCard,
        )

        // Send update-config-reply with true
        client.emit("update-config-reply", true);
        console.log("server side: did the emit new game, true update-config-reply");
      }, 2000);
    }
  });
});

// app routes
app.post("/api/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/api/user", (req, res) => {
  res.json(req.user || {});
});

// connect to Mongo
client.connect().then(() => {
  logger.info("connected successfully to MongoDB");
  db = client.db("final_project");
  gameConfig = db.collection("gameConfiguration");
  // operators = db.collection('operators')
  // orders = db.collection('orders')
  // customers = db.collection('customers')

  passport.use("disable-security", new CustomStrategy((req, done) => {
    if (req.query.key !== DISABLE_SECURITY) {
      console.log("you must supply ?key=" + DISABLE_SECURITY + " to log in via DISABLE_SECURITY")
      done(null, false)
    } else {
      done(null, { preferred_username: req.query.user, roles: [].concat(req.query.role) })
    }
  }))


  Issuer.discover("https://coursework.cs.duke.edu/").then((issuer) => {
    const client = new issuer.Client(gitlab);

    const params = {
      scope: "openid profile email",
      nonce: generators.nonce(),
      redirect_uri: "http://localhost:8221/login-callback",
      state: generators.state(),
    };

    function verify(
      tokenSet: any,
      userInfo: any,
      done: (error: any, user: any) => void
    ) {
      console.log("userInfo", userInfo);
      console.log("tokenSet", tokenSet);
      return done(null, userInfo);
    }

    passport.use("oidc", new Strategy({ client, params }, verify));

    app.get(
      "/api/login",
      passport.authenticate(passportStrategies, { failureRedirect: "/api/login" }),
      (req, res) => res.redirect("/")
    );

    app.get(
      "/login-callback",
      passport.authenticate(passportStrategies, {
        successRedirect: "/",
        failureRedirect: "/api/login",
      })
    );

    // start server
    server.listen(port);
    logger.info(`Game server listening on port ${port}`);
  });
});
