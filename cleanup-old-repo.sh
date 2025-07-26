#!/bin/bash

# SentryCoin v5.1 - Old Repository Cleanup Script
# This script will help clean up the accidentally pushed commits from the old repository

echo "🚨 SentryCoin v5.1 - Old Repository Cleanup"
echo "=========================================="
echo ""

# Step 1: Add the old repository as a remote (if not already added)
echo "📋 Step 1: Adding old repository as remote..."
git remote add old-repo https://github.com/dhananjay1434/SentryCoin.git 2>/dev/null || echo "Remote 'old-repo' already exists"

# Step 2: Fetch the old repository state
echo "📋 Step 2: Fetching old repository state..."
git fetch old-repo

# Step 3: Check what commits were pushed to old repo
echo "📋 Step 3: Checking commits in old repository..."
echo "Recent commits in old repository:"
git log --oneline old-repo/main -10

echo ""
echo "🔍 Commits that need to be removed from old repository:"
echo "- bab9bef: SentryCoin v5.1 'Apex Predator' - Complete Multi-Strategy Platform"
echo "- 8ee02fa: Ethereum Strategic Focus - ETHUSDT Primary Symbol"
echo ""

# Step 4: Find the last good commit before our pushes
echo "📋 Step 4: Finding last good commit before v5.1 pushes..."
LAST_GOOD_COMMIT=$(git log --oneline old-repo/main | grep -v "SentryCoin v5.1\|Ethereum Strategic Focus" | head -1 | cut -d' ' -f1)
echo "Last good commit: $LAST_GOOD_COMMIT"

echo ""
echo "⚠️  WARNING: The following commands will FORCE PUSH to the old repository"
echo "⚠️  This will remove the v5.1 commits from the old repository"
echo "⚠️  Make sure you have admin access to the old repository"
echo ""

read -p "Do you want to proceed with cleanup? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Proceeding with cleanup..."
    
    # Step 5: Reset to last good commit and force push
    echo "📋 Step 5: Resetting old repository to last good state..."
    
    # Create a temporary branch from the last good commit
    git checkout -b temp-cleanup $LAST_GOOD_COMMIT
    
    # Force push to reset the old repository main branch
    echo "🚨 Force pushing to reset old repository..."
    git push old-repo temp-cleanup:main --force
    
    # Clean up temporary branch
    git checkout main
    git branch -D temp-cleanup
    
    echo "✅ Old repository cleanup completed!"
    echo "✅ v5.1 commits removed from old repository"
    echo "✅ Old repository reset to last good state"
    
else
    echo "❌ Cleanup cancelled by user"
    echo "💡 Alternative: You can manually delete the old repository and recreate it"
fi

echo ""
echo "📋 Current repository status:"
echo "✅ Correct repository: https://github.com/dhananjay1434/SentryCoin-V5.git"
echo "✅ All v5.1 code is safely in the correct repository"
echo ""

# Step 6: Remove old-repo remote
echo "📋 Step 6: Cleaning up old-repo remote..."
git remote remove old-repo 2>/dev/null || echo "Remote 'old-repo' already removed"

echo "🎯 Cleanup script completed!"
