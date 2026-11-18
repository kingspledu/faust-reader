# Faust reader project rules

Read `FAUST_PRODUCTION_GUIDELINES.md` first. Its latest2026-11-18 rules and the user’s latest instructions override older notes and generators.

- Display names: 메피스토 / 그레첸. Preserve German and existing aligned Korean source translations verbatim inside closed source folds.
- Friendly omniscient narration for middle-school readers, natural Korean dialogue based on source exchanges. No narrator labels or adaptation disclaimers. Keep inner thoughts only where needed, labelled with the character name.
- At each first appearance, let readers know who the person is, what brought them into the scene, and how they relate to anyone already there. Establish the situation in narration before dialogue; use the illustration for concrete detail and leave identities or motives unresolved where the source leaves them open.
- The active manuscript is the clean-room rewrite in `cleanroom-novel.txt`. Preserve its dialogue and inner monologues when subsequently adding narration. Explain Mephisto's immediate intent and each character's competing wishes through the events of the scene.
- Mephisto speaks relaxed informal Korean to Faust, enjoying his reactions; polite speech is an intentional social disguise with other people. No copied Death Note lines/actor imitation or repeated laugh syllables.
- Edit `cleanroom-novel.txt` and run `install_cleanroom_novel.py` to rebuild structured scripts and chapter pages. Use the Gutenberg German text as the writing source.
- `voice-cast.json` is the single source for actor voice and persona. Model: `gemini-2.5-flash-preview-tts`. Never fall back silently for an unmapped speaker. Narration/dialogue are dry; only inner monologue gets the approved short echo and reverb with low but normally voiced delivery.
- Regenerate `build_tts_canvas.py` outputs and indexes after script/cast changes. Run `verify_dialogue_cast.py`, `node test_tts_effects.cjs`, and `node test_tts_batch_v04.cjs`. Real generation/listening is separate from static/mock tests.
- Keep all original chapter URLs, image anchors and protected source/translation pairs. Character/location sheets are generated only on demand, with existing reference identities checked first. User requests exact4x4 grids, unique row-major crops and varied compositions every3–4 source sentences.
- Existing authorized deployment: kingspledu/faust-reader main root GitHub Pages. Publish only scoped changes and confirm expected build SHA and public files. Do not stage unrelated review experiments or downloads.
