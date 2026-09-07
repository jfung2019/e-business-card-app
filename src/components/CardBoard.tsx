import React, { useCallback } from 'react';

import CardDragArea from './CardDragArea';
import CardList from './CardList';
import type { UserCard } from '../types/userCard';

interface CardBoardProps {
  cards: UserCard[];
  onCardsChange: (cards: UserCard[] | ((current: UserCard[]) => UserCard[])) => void;
}

function moveCard(cards: UserCard[], from: number, to: number): UserCard[] {
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= cards.length ||
    to >= cards.length
  ) {
    return cards;
  }
  const next = cards.slice();
  const [moved] = next.splice(from, 1);
  if (!moved) {
    return cards;
  }
  next.splice(to, 0, moved);
  return next;
}

export default function CardBoard({ cards, onCardsChange }: CardBoardProps) {
  const handleDrop = useCallback(
    (cardId: string, dropIndex: number) => {
      onCardsChange(current => {
        const fromIndex = current.findIndex(card => card._id === cardId);
        return moveCard(current, fromIndex, dropIndex);
      });
    },
    [onCardsChange],
  );

  return (
    <CardDragArea cards={cards} onDrop={handleDrop}>
      <CardList cards={cards} />
    </CardDragArea>
  );
}
