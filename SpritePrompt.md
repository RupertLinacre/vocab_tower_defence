# Sprite Prompt For Vocab Tower Defence

Create a complete, production-oriented 2D sprite pack for a child-friendly educational tower defence game called Vocab Tower Defence.

This should be a real game asset pack, not a poster, splash screen, or marketing illustration. The game already exists and works, but its visuals are mostly placeholder circles, rectangles, text, and simple particles. Your job is to replace those temporary primitives with polished sprites that feel cohesive, readable, and delightful for a seven-year-old.

The most important goal is clarity. Every sprite must still read instantly when scaled down in a live game. Do not spend effort on walk cycles, attack loops, or highly detailed cinematic poses. One strong static sprite per enemy, one strong static sprite per tower, a small set of projectile sprites, a small set of reusable impact and status sprites, and a few board/UI skin elements are enough.

## Game Setup You Must Design For

This is a single-screen Phaser game with a fixed layout.

- Canvas size: 1600 x 1025.
- Main battle board: 18 columns by 10 rows.
- Each board cell is 70 x 70 pixels.
- The board sits on the left side of the screen.
- A narrow side HUD sits to the right.
- A wide clue-and-answer panel sits along the bottom.
- The player clicks colored build squares to answer a four-choice vocabulary clue.
- A correct answer on an empty build square places that square's preset tower.
- Clicking an existing tower opens another vocabulary challenge that upgrades the tower up to level 5.
- A wrong answer when upgrading does not destroy the tower, but it jams the tower briefly.
- Enemies spawn in waves and follow a wide winding path from the left side of the board to the lower-right exit.
- The player loses lives when enemies reach the end.

There is no player character sprite, no hero unit, no resource collector, no shopkeeper, no walking-loop requirement, and no map scrolling. Focus only on the assets that actually appear in play.

## Camera And Readability Requirements

- Use a top-down or very slight 3/4 top-down game view.
- Every asset must remain readable at small scale.
- Keep silhouettes bold and clean.
- Avoid tiny fussy details that disappear when a sprite is only around 40 to 60 pixels tall on screen.
- Use transparent backgrounds for all individual assets.
- Keep each asset centered and evenly padded in its frame.
- Do not bake text into the sprites. The game already overlays words, level numbers, health bars, damage numbers, and some labels in code.
- Leave vertical breathing room above enemies for health bars.
- Leave breathing room around towers for a level badge, level stars, and a temporary JAM badge.

## Audience, Tone, And Emotional Direction

The game is for a seven-year-old. The mood should be playful, safe, clever, and exciting without becoming scary.

- Make the world feel like a magical word workshop or storybook learning fortress.
- Blend friendly fantasy with classroom and library details: books, pencils, paper tabs, brass fittings, soft crystals, cheerful lanterns, simple star shapes, alphabet motifs, and toy-like engineering.
- Enemies should feel mischievous, not horrifying.
- Explosions should feel like toy bursts, sparks, puffs, confetti, or magic pops, not realistic warfare.
- Fire effects should feel warm and magical, not destructive or traumatic.
- Nothing should feel grim, military, bloody, realistic, cruel, or post-apocalyptic.

## Existing Color Language To Preserve

The code already uses a readable color system. Keep that structure so the art still matches the gameplay.

- Easy difficulty: bright friendly green.
- Medium difficulty: warm orange.
- Hard difficulty: warm red.
- Very hard difficulty: playful purple.

Tower families already lean into these colors:

- Dart tower: sky blue body with sunny yellow accent.
- Cannon tower: orange body with warm cream accent.
- Missile tower: leafy green body with light lime accent.
- Laser tower: aqua/cyan body with white-hot accent.
- Ricochet tower: purple body with pink-violet accent.
- Cluster tower: coral red body with pale yellow accent.
- Fire tower: orange body with bright yellow accent.

Enemy families currently read as:

- Runner: bright yellow and quick.
- Normal enemy: rosy pink and balanced.
- Brute: red-orange and heavier.

The background already lives in deep teal, dark blue-green, and cool night-study colors. The sprite pack should glow beautifully against a dark teal board.

## Overall Art Direction

Create a cohesive visual world that feels like:

- a moonlit storybook library garden,
- a toy fortress built to protect words,
- and a magical classroom battle board.

The board should feel inviting and full of wonder. The towers should feel like clever learning gadgets. The enemies should feel like escaped ink creatures, paper pests, punctuation imps, or other cute word-themed troublemakers.

Important: keep everything in the same universe. Do not make one tower look steampunk, another fully sci-fi, and another medieval grimdark. The set should feel like one polished children's game.

## Exact Asset Scope

Create the following assets.

### 1. Tower Sprites

Make one static tower sprite for each of these seven tower families. Each tower sits on one 70 x 70 build square, so keep the footprint compact and centered. The code currently fires projectiles from the tower center, so each tower should have a clear center nozzle, lens, core, or launching point.

1. Dart tower
   Fast, precise, easy-difficulty tower.
   Visual idea: a bright toy target turret, a spring-loaded dart launcher, or a clever little learning gadget with a bullseye motif.
   Color direction: sky blue main body with sunny yellow aiming point.
   Personality: eager, accurate, nimble, friendly.
   It should look like it fires quick little shots, not heavy artillery.

2. Cannon tower
   Easy-difficulty splash tower.
   Visual idea: a squat toy mortar, blocky classroom cannon, or padded star-ball launcher.
   Color direction: warm orange with soft cream or pale gold accent.
   Personality: chunky, dependable, satisfying, safe.
   It should look like it launches round splash shots that go boom in a playful way.

3. Missile tower
   Medium-difficulty homing-impact tower.
   Visual idea: a child-friendly rocket pod, guided paper-plane launcher, or little tracking launcher built from polished toy materials.
   Color direction: leafy green with pale lime highlights.
   Personality: clever, slightly more advanced, energetic.
   It should read as a guided projectile tower, but still soft and playful.

4. Laser tower
   Medium-difficulty reflecting beam tower.
   Visual idea: a prism lighthouse, crystal study lamp, mirror-lens turret, or glowing reading-beam device.
   Color direction: aqua/cyan with bright white core.
   Personality: smart, clean, magical, precise.
   It should look like a beam emitter, not a blaster rifle.

5. Ricochet tower
   Hard-difficulty wall-bounce tower.
   Visual idea: a pinball-inspired launcher, bounce-orb cannon, or kaleidoscope bumper turret.
   Color direction: purple with pink-violet highlight.
   Personality: tricksy, springy, clever, high-skill.
   It should look like it shoots an orb that bounces and zaps.

6. Cluster tower
   Very-hard burst-bomb tower.
   Visual idea: a festive burst mortar, confetti popper turret, or celebratory firework launcher.
   Color direction: coral red with pale yellow highlight.
   Personality: dramatic, exciting, special, but still child-safe.
   It should feel like a burst attack that splits into smaller pieces, not a military bomb launcher.

7. Fire tower
   Very-hard spreading burn tower.
   Visual idea: a glowing lantern furnace, dragon-shaped classroom brazier, enchanted campfire turret, or warm magical flame projector.
   Color direction: orange body with bright yellow fire core.
   Personality: warm, magical, spreading, powerful.
   It should feel like it paints the path with magical fire, not violent destruction.

Shared tower requirements:

- Keep all towers in the same art family.
- Each tower should fit comfortably inside a square cell without overhanging too much.
- Towers should look good with a word label placed just below them by the game.
- Towers should still read clearly if the game adds level stars above them.
- Avoid extremely tall silhouettes that would collide visually with the badge and label overlays.

### 2. Enemy Sprites

Make exactly three enemy sprites, because the current game has exactly three enemy archetypes.

1. Runner enemy
   Smallest and fastest.
   Palette: bright yellow.
   Shape language: quick, slim, lively, maybe teardrop, comet-like, or little impish dart shape.
   Personality: zippy, mischievous, excitable.
   This should look like a fast little troublemaker.

2. Normal enemy
   Standard all-round enemy.
   Palette: rosy pink.
   Shape language: rounded, balanced, clear.
   Personality: cheeky, determined, playful.
   This is the baseline enemy silhouette.

3. Brute enemy
   Largest and slowest.
   Palette: red-orange.
   Shape language: chunky, stubborn, broad, slightly heavier.
   Personality: tough but still cute.
   It should look harder to stop, but never scary.

Shared enemy requirements:

- All three enemies should feel like the same species family.
- They can be word-themed ink creatures, paper gremlins, punctuation imps, or soft mischievous blobs with little crafted accessories.
- They must be readable from a mostly top-down angle, because they move in different directions along the path and the game does not use directional sprites.
- One static sprite per enemy is enough.
- Do not create walking cycles.
- Keep enough space above each enemy for a health bar.
- Faces should be simple and expressive even at small scale.

### 3. Projectile Sprites

Create one simple, readable sprite for each projectile type that actually exists in the code.

1. Dart projectile
   Tiny quick dart or star-tipped mini bolt.

2. Cannon projectile
   Round toy cannonball, padded burst shell, or chunky splash shot.

3. Missile projectile
   Friendly mini rocket with readable fins and a glowing nose.

4. Ricochet projectile
   Purple glowing bounce orb or enchanted pinball shot.

5. Cluster projectile
   Coral burst shell that looks like it will split apart.

6. Cluster fragment projectile
   Small pale-yellow shard, spark-star, or burst piece.

7. Fire projectile
   Warm ember orb, lantern flame shot, or magical fire seed.

Important projectile note:

- The laser attack in the current game is mostly drawn as a beam effect, so instead of a physical laser bullet, create a laser muzzle flash and a laser impact spark that match the laser tower's style.

### 4. Reusable Impact And Status FX Sprites

Create a compact set of reusable single-frame effect sprites that can replace the current simple circles and lines.

Required FX:

1. Small hit spark for dart impacts.
2. Orange splash explosion for cannon impacts.
3. Green shockwave or impact burst for missile hits.
4. Cyan-white beam impact sparkle for laser hits and reflections.
5. Purple ricochet spark or zap burst.
6. Pale yellow cluster detonation burst.
7. Small fragment pop burst.
8. Warm orange fire impact burst.
9. Burning ground patch or magical fire pool.
10. Smoke puff that works behind missiles, cluster shots, fire shots, and knockback impacts.
11. Electric or magical chain-zap streak that can connect two enemies.
12. Positive upgrade burst for level-up moments.
13. Comic-style jam malfunction burst for wrong answers on tower upgrades.
14. Simple gold star icon that can be reused near upgraded towers.

These should feel like cheerful game FX stickers, not realistic pyrotechnics.

### 5. Board And Environment Art

The battle board is fixed, so create art that respects the exact board structure.

Required environment pieces:

1. Main arena board background
   Create a polished left-side battlefield background that can sit behind the gameplay grid.
   The board should feel like a magical study-garden or toy fortress courtyard at night.
   It should include subtle ground texture, soft border framing, and a clearly readable winding path.

2. The path itself
   The path is wide, soft-edged, and very important for readability.
   It should feel like a glowing paper road, polished stone story path, or enchanted schoolyard trail.
   Make it visually distinct from buildable cells.

3. Buildable cell look
   Non-path cells should feel like safe little build pads or defended tiles.
   They should not overpower tower sprites.

4. Difficulty slot markers
   The current code colors build squares by vocabulary difficulty.
   Create a small visual marker language for easy, medium, hard, and very hard cells.
   These can be corner gems, glowing pins, runes, tabs, or tiny badges.
   They must be immediately readable as four distinct color families: green, orange, red, purple.

5. Spawn and exit markers
   Create small friendly visual markers for the path entry and path exit.
   These can be signposts, gates, portals, banners, or glowing floor emblems.
   They should be readable, but not visually dominant.

Important path-shape note:

The current route snakes through the board in this rough sequence:

- enters from the left side near the upper-left quarter,
- travels right,
- turns down,
- turns right,
- turns up,
- turns right again,
- turns down again,
- then exits to the right near the lower-right area.

More exact landmarking for layout-sensitive art:

- entry is near row 1.5,
- first long horizontal reaches about column 4.25,
- then path drops to about row 7.35,
- then crosses right to about column 9.4,
- then rises to about row 3.25,
- then crosses right to about column 14.2,
- then drops to about row 8.35,
- then exits off the right edge.

### 6. UI Skin Elements

The code already has a right-side info panel and a bottom prompt panel made from plain dark rounded rectangles. Create art that upgrades these areas without hurting readability.

Required UI pieces:

1. Right-side HUD panel skin.
2. Bottom clue panel skin.
3. Four-answer button style for large readable word choices.
4. Restart button style.
5. Small hover-tooltip bubble or hover card style.
6. Optional small icon set for clue types:
   - definition icon,
   - synonym icon,
   - antonym icon.

UI requirements:

- Keep the center area of buttons and panels calm enough for overlaid text.
- Do not put decorative clutter where words need to be read.
- The answer buttons should feel friendly and clickable.
- The whole UI should feel polished and magical, but not ornate enough to distract from the clue text.

## Suggested Asset Packaging

If possible, produce the assets as separate transparent-background sprites. If the model can only generate a single image, then make a clean, organized sprite atlas or concept sheet with generous spacing between assets and clear grouping by category.

Recommended grouping:

- Towers in one row or block.
- Enemies in one row or block.
- Projectiles and FX in one row or block.
- UI parts in one row or block.
- Board/environment art as separate larger panels.

## Technical Scale Guidance

Use these rough target sizes so the art feels usable in the current game.

- Towers: designed to read well when shown at roughly 44 to 56 pixels across inside a 70 x 70 cell.
- Enemies: designed to read well when shown at roughly 20 to 34 pixels across.
- Projectiles: tiny and bold, usually 6 to 18 pixels worth of visible shape once placed in game.
- FX: designed as compact burst stickers, not full-screen effects.
- UI panels: readable decorative framing with large calm areas for text.

## What To Avoid

- No walking loops.
- No idle animation sheets.
- No realistic guns, missiles, tanks, or military styling.
- No horror faces, sharp monster teeth, gore, or anything upsetting to a young child.
- No gritty realism.
- No grimdark dungeon mood.
- No over-detailed text painted onto the sprites.
- No perspective so dramatic that pieces stop fitting the board.
- No extra units, bosses, pets, currencies, shops, or characters that are not in the current game.
- No giant scenic background painting that makes gameplay harder to read.

## Final Creative Goal

Make this feel like a polished children's strategy game where vocabulary powers a magical toy fortress. The result should be colorful, coherent, readable, warm, and memorable. A child should immediately understand which enemies are fast or heavy, which towers are simple or advanced, and which parts of the board are safe build spaces versus the enemy path.

Again: prioritize clear static gameplay sprites over animation quantity. One excellent sprite per core thing in the game is better than lots of unnecessary variations.