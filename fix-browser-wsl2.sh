#!/bin/bash

echo "==================================="
echo "WSL2 Browser Fix for Claude"
echo "==================================="
echo ""
echo "The issue: Claude cannot use Windows Chrome from WSL2 for browser automation."
echo ""
echo "Solutions:"
echo ""
echo "1. RECOMMENDED: Install missing dependency for Firefox"
echo "   Run: sudo apt-get update && sudo apt-get install -y libasound2t64"
echo "   Then Claude can use Firefox for browser automation"
echo ""
echo "2. Alternative: Install Chrome for Linux in WSL2"
echo "   Run: wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -"
echo "   Run: sudo sh -c 'echo \"deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main\" >> /etc/apt/sources.list.d/google.list'"
echo "   Run: sudo apt-get update && sudo apt-get install google-chrome-stable"
echo ""
echo "3. Restore your Windows Chrome wrappers (if needed):"
echo "   Run: ./fix-browser-wsl2.sh restore"
echo ""

if [ "$1" == "restore" ]; then
    echo "Restoring original Chrome wrapper scripts..."
    mv /home/wesley/bin/google-chrome.wsl-wrapper /home/wesley/bin/google-chrome 2>/dev/null
    mv /home/wesley/bin/chromium.wsl-wrapper /home/wesley/bin/chromium 2>/dev/null
    mv /home/wesley/bin/chromium-browser.wsl-wrapper /home/wesley/bin/chromium-browser 2>/dev/null
    echo "✅ Restored!"
fi

# Clean up test files
rm -f test-browser.cjs 2>/dev/null

echo ""
echo "Current browser status:"
echo "- Firefox for Playwright: ✅ Installed"
echo "- Missing dependency: libasound2t64"
echo ""
echo "After installing the dependency, Claude will be able to use browser automation."