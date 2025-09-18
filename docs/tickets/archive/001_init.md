# Quizly Spec

- a react native pwa. mobile first design (pwa)
- its very similar to quizlet, a flashcard app
- systematic style config for easy global style changes during dev
- beautiful color scheme
- graphics are sleek and clean but the app is design to be extremely fast even
  on older devices
- we define the backend card data structure

{ "metadata": {! "deck_name": "Chinese Language Basics", "description":
"Essential Chinese language vocabulary and phrases for beginners, covering
greetings, daily life, numbers, and basic conversation", "category": "Language
Learning", "available_levels": [1, 2, 3], "available_sides": 4, "card_count":
44, "difficulty": "beginner_to_intermediate", "tags": ["chinese", "mandarin",
"language", "vocabulary", "pronunciation"], "version": "1.0.0", "created_date":
"2025-01-22", "last_updated": "2025-01-22" }, "content": [ { "idx": 0, "name":
"hello greeting", "side_a": "hello", "side_b": "nǐ hǎo", "side_c": "你好",
"side_d": "Most common Chinese greeting, literally means 'you good'", "level":
1, } ] }

- sanitization requires these minimum data
- language app has the following modes (once a deck has been selected):
  flashcards, learn, match, test
- main tab navigation: Home (list of decks)
- once a deck is selected you can select the 4 modes, scrolling down further
  shows each card in the deck

# Deck view (a deck has been selected from the home tab)

# flashcards

- start with full deck
- default to show side_a on front and side_b on back
- settings icon allows you to change and group defaults e.g. show side_c on
  front and side_a + side_b on back; side selection auto-adjusts to
  "available_sides" for the deck
- tap card to show opposite side
- swipe left for missed and swipe right for got it right. counters on left/right
  sides of view show how many are right/wrong for the session
- after swiping through the entire deck auto restart with the missed cards and
  repeat
- speech icon allows app to read card to user
- optional timer option will keep user on track and auto-swipe left if not
  completed in time

# learn

- start with full deck
- default to show side_a at the top of the view, bottom view is multiple choice
  (4) of correct side_b for that card and 3 others from the deck
- settings icon allows you to change and group defaults e.g. show side_c on top
  and multiple choice side_a + side_b on bottom view; side selection
  auto-adjusts to "available_sides" for the deck; can also choose "randomize"
  and learn will automatically swap and combine sides
- correctly guessed answers are marked for completion (a nice tone sound, a word
  of encourgemant above the multiple choice answers)
- every few questions switch to free text answer key and user has to type in
  answer
- always shows correct answer when user gets it wrong
- incorrect
- settings icon allows number of cards to learn for a given round, default to 10
- incorrect answers are shuffled back into the deck for the given round
- settings icon allows learning progression based on "available_levels" incr
  easy to hard or random
- questions that are re-attempted show "let's try again" above the question the
  second time around
- free text answers allow "override: I was correct" if the user gets it wrong
  (this is an option to press under "continue" after an answer was selected)
- missed cards from the previous round are automatically included in the next
  round of 10 cards

# match

- a 3x4 grid (adjustable in settings)
- a timer counts up at top
- match sides that belong to the same card (default side_a and side_b shown)
- settings allows adjusting sides that appear in multiple ways e.g. show side_a
  for half the cards and side_b+side_c together for the other half of cards; or
  side_b, side_a, side_c on separate cards for a 3-way match game
- attempt to match the cards to eachother by tappign them in order
- correctly grouped cards play a sound and are removed from the grid
- round continues until grid is empty
- subsequent rounds shuffle in new cards and re-use missed ones similar to LEARN
  mode
- completed round goes to a success screen that shows your time and your best
  time beneath it for that deck of cards
- selecting play another round on the success screen starts a new round

# test

- select test to include T/F, multiple choice, and free response
- select test to focus on certain sides (e.g. side_a, side_b) or all sides and
  which side is Q vs A
- selecting auto for Q/A will result in app shuffling between which sides are
  asked, which are provided in the question
- toggle whether sides appear together e.g. always group side_b and side_c
  together whether they appear in the answer or the question
- select number of questions to include up to deck max
- toggle instant feedback or wait until end

All settings have this same phenomenon where we decide which sides appear
grouped together e.g. for the language card example we might select that we
always show side_c (chinese chars) and side_b (pinyin) together. this way our
app is versatile - many concepts can we concieved of in the card framework as
mutiple sides can indicate different vantage points about the subject (e.g. in
math a formula vs description vs name)

other than the 4 learning modes, the ability to select a deck, edit a deck, and
the ability to add a deck (manually data entry fields for now) i dont see any
other phase 1 features to add.

# other app considerations

- everything runs client side
