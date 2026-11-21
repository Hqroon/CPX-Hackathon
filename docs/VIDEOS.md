# The reel videos (35 clips, 85 MB)

**Where they are:** on the **`media` branch** (`backend/media/reels/r01.mp4` … `r35.mp4`).
**`main` has only the list** (`backend/data/reels.json`), so `git pull origin main` takes seconds instead of 10+ minutes.

> **Never commit videos to `main`** (or to any feature branch). `backend/media/reels/` is gitignored on purpose. Videos go on `media` only.

---

## Who needs the videos?

Only the **demo laptop** and the **APK builder**. Everyone else can work without them: the app shows coloured mock reels when the videos aren't there.

## Get the videos (once, on a good network)

From inside your repo folder (`CPX-Hackathon`):
```powershell
git fetch origin media
```
```powershell
git worktree add ../cpx-media origin/media
```
This creates a **separate folder next to your repo**, `../cpx-media`, with the videos inside. Your own branch and working folder are untouched.

Then tell the backend where they are. In `backend/.env` (create it from `.env.example` if needed), use the **full path**, for example:
```
REELS_DIR=D:\CPX Hacakthon\cpx-media\backend\media\reels
```
Restart the backend. `http://localhost:8787/api/health` should show `"videosFound": 35`.

**No Git?** On GitHub: switch the branch dropdown to **`media`** → **Code → Download ZIP** → unzip anywhere → point `REELS_DIR` at its `backend\media\reels` folder.

## For the APK

After setting `REELS_DIR`, run `npm run bundle:media` in `frontend/`. It copies the videos from that folder into the app (see ANDROID_APK.md).

## Adding or replacing videos (M3)

```powershell
cd ../cpx-media
```
```powershell
git switch -c media-update origin/media
```
Add or replace files in `backend/media/reels/`, then:
```powershell
git add backend/media/reels
```
```powershell
git commit -m "media: add r36-r40"
```
```powershell
git push origin media-update:media
```
If the **list** changed (new ids or captions), also update `backend/data/reels.json` on your normal branch and open a PR to `main`. Run `npm run manifest` in `backend/` with `REELS_DIR` set to regenerate it.

## If you pulled `main` before the videos were moved (21 Nov, ~15:30)

Your local `main` still has the old video commits. Reset it to the new one. **Commit or stash any work first**, because this throws away uncommitted changes on `main`:
```powershell
git switch main
```
```powershell
git fetch origin main
```
```powershell
git reset --hard origin/main
```
If you **created a branch after pulling the videos**, don't open a PR from it as-is: it would bring the videos back into `main`. Ask M1 to move your commits onto the new `main`.

The original video commits (by M3) are preserved on `media`: `e097974` … `56dde2a`.
