#!/bin/bash

# Helper script to commit changes with a descriptive message

# Get the commit message from the command line argument
MESSAGE=$1

# If no message was provided, use a default message
if [ -z "$MESSAGE" ]; then
  echo "Please provide a commit message"
  exit 1
fi

# Add all changes
git add .

# Commit with the provided message
git commit -m "$MESSAGE"

echo "Changes committed successfully with message: $MESSAGE"
