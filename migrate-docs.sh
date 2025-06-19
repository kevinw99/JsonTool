#!/bin/bash

# Documentation Migration Script for New JSON Tool Project
# Usage: ./migrate-docs.sh /path/to/new/project

if [ $# -eq 0 ]; then
    echo "Error: Please provide the path to the new project directory"
    echo "Usage: ./migrate-docs.sh /path/to/new/project"
    exit 1
fi

NEW_PROJECT_DIR="$1"
CURRENT_DIR="$(pwd)"

echo "🚀 Migrating essential documentation to new project..."
echo "📁 Target directory: $NEW_PROJECT_DIR"

# Check if target directory exists
if [ ! -d "$NEW_PROJECT_DIR" ]; then
    echo "❌ Error: Directory $NEW_PROJECT_DIR does not exist"
    exit 1
fi

cd "$NEW_PROJECT_DIR"

# Create directory structure
echo "📂 Creating documentation structure..."
mkdir -p docs/testing docs/archive

# Copy essential files
echo "📄 Copying essential files..."
cp "$CURRENT_DIR/EXECUTIVE_SUMMARY.md" "./PROJECT_STRATEGY.md"
cp "$CURRENT_DIR/NEW_PROJECT_PACKAGE.json" "./package.json" 
cp "$CURRENT_DIR/PRACTICAL_FONT_INDENTATION_GUIDE.md" "./docs/IMPLEMENTATION_GUIDE.md"
cp "$CURRENT_DIR/TESTING_FRAMEWORK.md" "./docs/testing/REGRESSION_TESTS.md"

# Copy reference materials
echo "📚 Copying reference materials..."
cp "$CURRENT_DIR/NEW_PROJECT_FEATURES.md" "./docs/archive/FEATURES_INVENTORY.md"
cp "$CURRENT_DIR/REFINED_TECHNICAL_ROADMAP.md" "./docs/archive/TECHNICAL_ROADMAP.md"
cp "$CURRENT_DIR/OPTIMIZED_ROADMAP.md" "./docs/archive/DEVELOPMENT_PHASES.md"

# Create a simple README for the new project
echo "📝 Creating new project README..."
cat > README.md << 'EOF'
# JSON Comparison Tool V2

A modern, efficient JSON comparison and analysis tool built with React, TypeScript, and Vite.

## Features

- **Perfect Indentation**: Pixel-perfect alignment using Monaco font and character-based spacing
- **Intelligent Array Comparison**: Automatic ID key detection for smart array diffing
- **Synchronized Viewers**: Coordinated navigation and state management
- **Advanced Navigation**: "Go To" functionality with visual highlighting
- **Comprehensive Diff Management**: Interactive diff list with ignore/restore capabilities

## Quick Start

```bash
npm install
npm run dev
```

## Documentation

- [`PROJECT_STRATEGY.md`](PROJECT_STRATEGY.md) - Strategic overview and development approach
- [`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md) - Technical implementation guidance
- [`docs/testing/REGRESSION_TESTS.md`](docs/testing/REGRESSION_TESTS.md) - Test specifications and regression prevention
- [`docs/archive/`](docs/archive/) - Reference materials and comprehensive feature documentation

## Development Philosophy

This project prioritizes:
1. **Foundation-first development** - Synchronization and indentation before features
2. **Regression prevention** - Comprehensive testing for visual alignment
3. **Clean architecture** - Modern CSS and TypeScript patterns
4. **User experience** - Smooth, intuitive interactions

Built with lessons learned from extensive research and prototyping.
EOF

echo "✅ Documentation migration complete!"
echo ""
echo "📋 Files copied to new project:"
echo "   ✓ PROJECT_STRATEGY.md (strategic overview)"
echo "   ✓ package.json (optimized dependencies)"
echo "   ✓ docs/IMPLEMENTATION_GUIDE.md (technical guidance)"
echo "   ✓ docs/testing/REGRESSION_TESTS.md (test specifications)"
echo "   ✓ docs/archive/* (reference materials)"
echo "   ✓ README.md (new project overview)"
echo ""
echo "🎯 Next steps:"
echo "   1. cd $NEW_PROJECT_DIR"
echo "   2. npm install"
echo "   3. Review PROJECT_STRATEGY.md"
echo "   4. Start with Phase 1: Foundation & Synchronization"
echo ""
echo "📚 Use docs/archive/ for reference when implementing complex features"
