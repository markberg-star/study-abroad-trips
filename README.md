# Study abroad trips

A phone checklist for Barcelona and weekend trips. The page reads `data/trips.json` only.

Add a place by editing that file. A place can include a `blurb`, a `source` link, an `image` path in this repo, and a photo `credit`. Each item has an `id`, a `category` (`Place`, `Do`, `Food`, `Tip`, or `Note`), a `title`, `details`, and a `source` link when there is one.

Done checkboxes are saved in the phone browser. They are not written back into the file. Personal notes do not belong in this repo.

The page is plain HTML, CSS, and JavaScript. A service worker caches the page and `data/trips.json` so the last opened list works offline.
