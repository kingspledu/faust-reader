# Faust consistency reference

1. Read `reference-index.json` first. Resolve entries by stable `id`; never rely on display order or name alone.
2. Scope: Part I only. Chapter numbers are 1-based. Anonymous speakers are scoped to their source chapter. Joint speech cues and choruses are not unique people.
3. Open the entry image before using it as a visual reference. `draft_visual` means generated draft, not approved canon; `research_only` means no approved visual design exists. Never invent an existing sheet.
4. Preserve `visual_locks`, separating canonical source facts from adaptation choices. Check `unresolved` and `variants_note`. For Faust, old scholar and rejuvenated form require explicit variant handling. Margarete/Gretchen is one identity; poodle is Mephistopheles' form.
5. Verify scene-specific facts via `source_urls`; source text takes priority over tiny generated image labels. Floor plans are invented staging diagrams, not geographic maps. Check consistency of door/window placement across angles before treating a location sheet as fixed.
6. Use `index.html#<id>` as the human-readable permanent reference. Add new visual variants without overwriting existing images. Preserve IDs when entries are renamed or reordered.
7. Reference images and prose may contain visual choices absent from Goethe. Do not convert invented heights, horns, costume details, or layouts into canonical claims.

Human site: https://kingspledu.github.io/faust-reader/art-bible/
Machine index: https://kingspledu.github.io/faust-reader/art-bible/reference-index.json

## On-demand generation policy

User decision: stop bulk sheet generation at the current 41 visual drafts. Do not proactively complete all remaining research entries. During future scene production, first search the reference index and inspect an existing matching sheet. Generate a new individual character or location sheet only when that scene needs a reference that is missing. Preserve existing identities and style, save a new asset without overwriting prior sheets, update the index and human page, and keep canonical facts separate from adaptation choices. An existing draft needing a new state or costume should receive an explicitly named variant, not a new identity.
