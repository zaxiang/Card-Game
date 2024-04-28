import { test, expect, type Page } from '@playwright/test';


test('initial test', async ({ browser }) => {
  const zx122 = await browser.newContext();
  const user1 = await browser.newContext();
  const user2 = await browser.newContext();

  const zx122Page = await zx122.newPage();
  const user1Page = await user1.newPage();
  const user2Page = await user2.newPage();

  //get the initial card for each player
  await zx122Page.goto('http://localhost:31000/api/login\?key=alpha-beta-delta\&user=zx122\&role=__');

  await zx122Page.getByRole('button', { name: 'New Game' }).click();
  await zx122Page.getByRole('button', { name: 'Draw Card' }).click();

  await user1Page.goto('http://localhost:31000/api/login\?key=alpha-beta-delta\&user=user1\&role=__');
  await user1Page.getByRole('button', { name: 'Draw Card' }).click();

  await user2Page.goto('http://localhost:31000/api/login\?key=alpha-beta-delta\&user=user2\&role=__');
  await user2Page.getByRole('button', { name: 'Draw Card' }).click();

  //go back to first player and get the 2nd card
  await zx122Page.getByRole('button', { name: 'Draw Card' }).click();
  await user1Page.getByRole('button', { name: 'Draw Card' }).click();
  await user2Page.getByRole('button', { name: 'Draw Card' }).click();

  //check game phase to be initial-card-dealin
  const badgeElement_0 = await zx122Page.$('.mb-2'); // Selector for the <b-badge> element
  if (badgeElement_0 !== null) {
    const badgeText = await badgeElement_0.textContent();
    
    // Check if badgeText is not null before performing assertions
    if (badgeText !== null) {
      expect(badgeText.trim()).toEqual('initial-card-dealing');
    } else {
      console.error('Badge text is null');
    }
  } else {
    // Handle the case where the element is not found
    console.error('Badge element not found');
  }


  //go back to first player and get the 3rd card
  await zx122Page.getByRole('button', { name: 'Draw Card' }).click();
  await user1Page.getByRole('button', { name: 'Draw Card' }).click();
  await user2Page.getByRole('button', { name: 'Draw Card' }).click();

  //go back to first player and get the 4th card
  await zx122Page.getByRole('button', { name: 'Draw Card' }).click();

  //check game phase to be play
  const badgeElement = await zx122Page.$('.mb-2'); // Selector for the <b-badge> element
  if (badgeElement !== null) {
    const badgeText = await badgeElement.textContent();
    
    // Check if badgeText is not null before performing assertions
    if (badgeText !== null) {
      expect(badgeText.trim()).toEqual('play');
    } else {
      console.error('Badge text is null');
    }
  } else {
    // Handle the case where the element is not found
    console.error('Badge element not found');
  }

  const cardElement = await zx122Page.$('pre[style*="color: green"]');
  // Check if the card element is found
  if (cardElement) {
    // Simulate clicking on the card
    await cardElement.click();
  } else {
    console.error('Valid Card element not found for zx122');
    // If a valid card with green color is not found, draw a new card
    await zx122Page.getByRole('button', { name: 'Draw Card' }).click();
  }

  // go to user1:
  //check game phase to be play
  const badgeElement_1 = await user1Page.$('.mb-2'); // Selector for the <b-badge> element
  if (badgeElement_1 !== null) {
    const badgeText = await badgeElement_1.textContent();
    
    // Check if badgeText is not null before performing assertions
    if (badgeText !== null) {
      expect(badgeText.trim()).toEqual('play');
    } else {
      console.error('Badge text is null');
    }
  } else {
    // Handle the case where the element is not found
    console.error('Badge element not found');
  }

  const cardElement_1 = await user1Page.$('pre[style*="color: green"]');
  // Check if the card element is found
  if (cardElement_1) {
    // Simulate clicking on the card
    await cardElement_1.click();
  } else {
    console.error('Valid Card element not found for User1');
    // If a valid card with green color is not found, draw a new card
    await user1Page.getByRole('button', { name: 'Draw Card' }).click();
  }

  // go to user2:
  //check game phase to be play
  const badgeElement_2 = await user2Page.$('.mb-2'); // Selector for the <b-badge> element
  if (badgeElement_2 !== null) {
    const badgeText = await badgeElement_2.textContent();
    
    // Check if badgeText is not null before performing assertions
    if (badgeText !== null) {
      expect(badgeText.trim()).toEqual('play');
    } else {
      console.error('Badge text is null');
    }
  } else {
    // Handle the case where the element is not found
    console.error('Badge element not found');
  }

  const cardElement_2 = await user2Page.$('pre[style*="color: green"]');
  // Check if the card element is found
  if (cardElement_2) {
    // Simulate clicking on the card
    await cardElement_2.click();
  } else {
    console.error('Valid Card element not found for User2');
    // If a valid card with green color is not found, draw a new card
    await user2Page.getByRole('button', { name: 'Draw Card' }).click();
  }
});
