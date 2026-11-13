# for thea ♥

A little pixel-art birthday site. Plain HTML/CSS/JS: no build step, no server, no dependencies.

## Editing the gifts
Everything you'd want to change is in **`js/content.js`**:
- **letter**: the greeting, paragraphs and sign-off
- **albums**: title, artist and cover image for each album (put the images in `assets/albums/`)
- **music**: the song that plays after the password: `assets/audio/last-christmas.mp3`
- **audio**: the recording (put it in `assets/audio/`, mp3 or m4a)

The secret word is set in `js/main.js` (`SECRET`, base64 of the lowercase word).

## Try it locally
Double-click `index.html`. Or, to get the exact GitHub Pages behaviour:
```
python -m http.server 5500
```
then open http://localhost:5500

## Put it on GitHub Pages
1. Create a new repo on GitHub and upload everything in this folder.
2. Repo → **Settings → Pages** → Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)`.
3. After a minute it's live at `https://<your-username>.github.io/<repo-name>/`.
