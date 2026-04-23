#!/bin/bash
# Run speechify batch for all decks. Does NOT restart relay.
# Runs until the extension dies, commits progress, stops.
# Re-run to continue where it left off (skips completed files).
# Usage: bash scripts/speechify-run-all.sh

DECK_DIR="/home/wabbazzar/code/quizly/public/data/decks"
AUDIO_DIR="/home/wabbazzar/code/quizly/public/data/audio/words"
SCRIPT="/home/wabbazzar/code/quizly/scripts/speechify-batch.ts"
DEVBROWSER_DIR="/home/wabbazzar/.claude/plugins/cache/dev-browser-marketplace/dev-browser/66682fb0513a/skills/dev-browser"

gsettings set org.gnome.desktop.session idle-delay 0 2>/dev/null

echo "=== Speechify Batch Runner ==="
echo "Started: $(date)"

DECKS=$(python3 -c "
import json
m = json.load(open('$DECK_DIR/manifest.json'))
for f in sorted(m):
    if f != 'manifest.json': print(f)
")

TOTAL_DECKS=$(echo "$DECKS" | wc -l)
CURRENT=0

for DECK_FILE in $DECKS; do
  CURRENT=$((CURRENT+1))
  DECK_ID="${DECK_FILE%.json}"
  DECK_PATH="$DECK_DIR/$DECK_FILE"

  NEEDED=$(python3 -c "
import json, os
d = json.load(open('$DECK_PATH'))
n = sum(1 for c in d['content'] for s in ['a','b'] if not os.path.exists('$AUDIO_DIR/${DECK_ID}_card'+str(c['idx'])+'_side_'+s+'.mp3'))
print(n)
")

  [ "$NEEDED" = "0" ] && echo "[$CURRENT/$TOTAL_DECKS] SKIP $DECK_ID" && continue

  echo "[$CURRENT/$TOTAL_DECKS] $DECK_ID ($NEEDED files)"

  cd "$DEVBROWSER_DIR"
  timeout 600 npx tsx "$SCRIPT" "$DECK_PATH" 2>&1
  EXIT_CODE=$?
  cd /home/wabbazzar/code/quizly

  # Commit progress regardless of success/failure
  git add public/data/audio/words/ 2>/dev/null
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -m "feat(audio): add per-card audio for $DECK_ID"
    git push origin main
    echo "  Committed"
  fi

  # Always continue to next deck even on failure
  if [ $EXIT_CODE -ne 0 ]; then
    REMAINING=$(python3 -c "
import json, os
d = json.load(open('$DECK_PATH'))
n = sum(1 for c in d['content'] for s in ['a','b'] if not os.path.exists('$AUDIO_DIR/${DECK_ID}_card'+str(c['idx'])+'_side_'+s+'.mp3'))
print(n)
")
    echo "  Failed ($REMAINING remaining). Continuing..."
    sleep 3
  fi
done

TOTAL_FILES=$(ls $AUDIO_DIR/*.mp3 2>/dev/null | wc -l)
echo ""
echo "=== STOPPED ==="
echo "Time: $(date)"
echo "Files: $TOTAL_FILES"
gsettings set org.gnome.desktop.session idle-delay 300 2>/dev/null
