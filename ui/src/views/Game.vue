<template>
  <div>
    <b-button class="mx-2 my-2" size="sm" @click="socket.emit('new-game')">New Game</b-button>
    <b-badge class="mr-2 mb-2" :variant="myTurn ? 'primary' : 'secondary'">turn: {{ currentTurnPlayerIndex }}</b-badge>
    <b-badge class="mr-2 mb-2">{{ phase }}</b-badge>
    <b-button class="mx-2 my-2" size="sm" @click="showConfigModal = true">Configure</b-button>
    <b-modal v-model="showConfigModal" @shown="loadConfig">
      <template #modal-title>
        Configuration
      </template>
      <b-overlay :show="!configLoaded">
        <b-form @submit.prevent="saveConfig">
          <b-form-group label="Number of Decks">
            <b-form-input v-model="configForm.numberOfDecks" type="number" min="1"></b-form-input>
          </b-form-group>
          <b-form-group label="Rank Limit">
            <b-form-input v-model="configForm.rankLimit" type="number" min="1"></b-form-input>
          </b-form-group>
          <b-form-group label="Suit Limit">
            <b-form-input v-model="configForm.suitLimit" type="number" min="1"></b-form-input>
          </b-form-group>
          <b-form-group label="Wild Card">
            <b-form-input v-model="configForm.wildCard" type="string"></b-form-input>
          </b-form-group>
          <b-button type="submit" :disabled="!configLoaded">Save Changes</b-button>
        </b-form>
      </b-overlay>
    </b-modal>
    <p style="font-size: smaller;">
      Color Code :
      <span style="color: red;">Red: last card played; </span>
      <span style="color: green;">Green: legal to play now; </span>
      <span style="color: blue;">Blue: not legal to play now; </span>
      <span style="color: grey;">Grey: already played; </span>
    </p>
    <div>
      <AnimatedCard v-for="card in cards" :key="card.id" :card="card" :cards="cards" :card-id="card.id"
        :wildCard="wildCard" @play="playCard" />
    </div>
    <b-button class="mx-2 my-2" size="sm" @click="drawCard" :disabled="!myTurn">Draw Card</b-button>
    <div v-if="phase === 'play'"  v-for="(player, i) in fewCardPlayers" :key="i">
      <pre>{{ player }} have only 1 or fewer cards left in their hands </pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, Ref } from 'vue'
import { io } from "socket.io-client"
import AnimatedCard from '../components/AnimatedCard.vue'
import { Card, GamePhase, Action, CardId, Config } from "../../../server/model"

//Config form
const showConfigModal = ref(false);
const configForm = ref<Config>({
  configurationId: "default",
  numberOfDecks: 5,
  rankLimit: 13,
  suitLimit: 4,
  wildCard: "Q",
});
const configLoaded = ref(false); //show overlay and disable if this is false

function loadConfig() {
  console.log('inside loadConfig');
  socket.emit('get-config');
  socket.once('get-config-reply', (config: Config) => {
    console.log('inside the loadConfig and get-reply');
    configForm.value.numberOfDecks = config.numberOfDecks;
    configForm.value.rankLimit = config.rankLimit;
    configForm.value.suitLimit = config.suitLimit;
    configForm.value.wildCard = config.wildCard;
    console.log(configForm.value);
    configLoaded.value = true;
  });
}

async function saveConfig() {
  console.log("inside the save config func");
  //convert to number
  configForm.value.numberOfDecks = +configForm.value.numberOfDecks;
  configForm.value.rankLimit = +configForm.value.rankLimit;
  configForm.value.suitLimit = +configForm.value.suitLimit;

  console.log("already do the overlay thing");
  configLoaded.value = false;

  socket.emit("update-config", configForm.value);
  const success = await new Promise<boolean>((resolve) => {
    socket.once("update-config-reply", (result: boolean) => {
      resolve(result);
    });
  });

  // Hide overlay
  configLoaded.value = true;

  if (success) {
    // Additional logic to signal a new game if needed
    // For example, close the modal
    showConfigModal.value = false;
  }
}

const socket = io()
const playerIndex: Ref<number | "all"> = ref("all")

const cards: Ref<Card[]> = ref([])
const currentTurnPlayerIndex = ref(-1)
const phase = ref("")
const playCount = ref(-1)

const fewCardPlayers: Ref<string[]> = ref([])
const wildCard = ref("")

const myTurn = computed(() => currentTurnPlayerIndex.value === playerIndex.value && phase.value !== "game-over")

socket.on("all-cards", (allCards: Card[]) => {
  cards.value = allCards
})

socket.on("updated-cards", (updatedCards: Card[]) => {
  applyUpdatedCards(updatedCards)
})

socket.on("game-state", (newPlayerIndex: number, newfewCardPlayers: string[], newCurrentTurnPlayerIndex: number, newPhase: GamePhase, newPlayCount: number, newWildCard: string) => {
  if (newPlayerIndex != null) {
    playerIndex.value = newPlayerIndex
    console.log("in the func: playerIndex.value", playerIndex.value)
  }
  currentTurnPlayerIndex.value = newCurrentTurnPlayerIndex
  console.log("in the func: currentTurnPlayerIndex.valu", currentTurnPlayerIndex.value)
  phase.value = newPhase
  playCount.value = newPlayCount
  wildCard.value = newWildCard
  fewCardPlayers.value = newfewCardPlayers
})

function doAction(action: Action) {
  return new Promise<Card[]>((resolve, _) => {
    socket.emit("action", action)
    socket.once("updated-cards", (updatedCards: Card[]) => {
      resolve(updatedCards)
    })
  })
}

async function drawCard() {
  if (typeof playerIndex.value === "number") {
    const updatedCards = await doAction({ action: "draw-card", playerIndex: playerIndex.value })
    if (updatedCards.length === 0) {
      alert("didn't work")
    }
  }
}

async function playCard(cardId: CardId) {
  if (typeof playerIndex.value === "number") {
    const updatedCards = await doAction({ action: "play-card", playerIndex: playerIndex.value, cardId })
    if (updatedCards.length === 0) {
      alert("didn't work")
    }
  }
}

async function applyUpdatedCards(updatedCards: Card[]) {
  for (const x of updatedCards) {
    const existingCard = cards.value.find(y => x.id === y.id)
    if (existingCard) {
      Object.assign(existingCard, x)
    } else {
      cards.value.push(x)
    }
  }
}
</script>