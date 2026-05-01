# Implementation Plan: Issue #63

Issue: https://github.com/andsaki/music-player-from-drive/issues/63

Title: 再生中はタイトルゆっくり左へループのアニメーションしてもいいかも

Plan:
- Add a bounded title marquee component for the custom player.
- Animate the currently playing title slowly to the left in a loop only while playing or loading.
- Preserve ellipsis/static rendering when paused and respect reduced motion.
- Run build, tests, and UI screenshot checks.
