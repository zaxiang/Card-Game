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
import {RANKS, CardId, Card, formatCard} from "../../../server/model";

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
