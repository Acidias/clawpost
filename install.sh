#!/bin/bash

echo "🚀 Installing Social Media Publisher skill..."

cd "$(dirname "$0")"

# Create symlink for easy CLI access
if [ ! -L "/usr/local/bin/clawpost" ]; then
    sudo ln -s "$(pwd)/cli.js" /usr/local/bin/clawpost 2>/dev/null || {
        echo "ℹ️  Could not create global symlink. You can run the CLI with: node $(pwd)/cli.js"
    }
fi

echo "✅ Social Media Publisher skill installed!"
echo ""
echo "🚀 Starting setup wizard..."
echo ""
node cli.js setup
echo ""
echo "💡 After completing setup, try these commands:"
echo "   node cli.js status              # Check connection"
echo "   node cli.js generate \"AI trends\" # Generate content"
echo "   node cli.js draft \"Hello world!\" # Create draft"
echo "   node cli.js post \"Direct post!\"  # Publish immediately"
echo ""
echo "📖 Need help? Run: node cli.js help"