<!-- ui/src/components/AnimatedCard.vue -->

<template>
  <div
      @click="playCard(cardId)"
    >
    <pre :style="{ color: getTextColor(card, cards, wildCard)}">{{ formatCard(card, true) }}</pre>
    </div>
</template>


<style scoped>
.formatted-card {
  white-space: pre;
}
</style>

<script setup lang="ts">
// import { CardId, Card, formatCard } from "../../../server/model";


const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
const SUITS = ["♦️", "♥️", "♣️", "♠️"]

type CardId = string
type LocationType = "unused" | "last-card-played" | "player-hand"

interface Card {
  id: CardId
  rank: typeof RANKS[number]
  suit: typeof SUITS[number]
  locationType: LocationType
  playerIndex: number | null
  positionInLocation: number | null
}

function formatCard(card: Card, includeLocation = false) {
  let paddedCardId = card.id
  while (paddedCardId.length < 3) {
    paddedCardId = " " + paddedCardId
  }
  return `[${paddedCardId}] ${card.rank}${card.suit}${(card.rank.length === 1 ? " " : "")}`
    + (includeLocation
      ? ` ${card.locationType} ${card.playerIndex ?? ""}`
      : ""
    )
}

// props
interface Props {
  card: Card
  cardId: CardId
  cards: Card[]
  wildCard: string
}

// default values for props
const props = withDefaults(defineProps<Props>(), {
  card: () => ({} as Card),
  cardId: 'defaultCardId',
  cards: () => [],
  wildCard: "Q",
})
console.log(props)

// events
const emit = defineEmits<{
  (e: 'play', cardId: CardId): void
}>()

function playCard(cardId: CardId) {
  emit("play", cardId)
}

function getTextColor(card: Card, cards: Card[], wildCard: string): string {
  // const last_card = cards.find(card => card.locationType === "last-card-played")!;
  // console.log(last_card);

  console.log(cards);
  let last_card = null;
  for (const card of cards) {
    if (card.locationType === "last-card-played") {
      last_card = card;
      break;
    }
  }
  console.log(last_card);
  console.log(card.rank);
  console.log(last_card?.rank);
  console.log(wildCard);

  if (card.locationType === 'last-card-played') {
    return 'red';
  }
  else if (card.locationType === 'unused'){
    return 'grey';
  }
  else if (last_card && (card.rank === last_card.rank || card.suit === last_card.suit)) {
    return 'green';
  }
  else if (card.rank == wildCard || last_card?.rank == wildCard) {
    return 'green';
  }
  else {
    return 'blue';  
  }
}


</script>
