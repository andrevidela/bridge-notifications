#!/bin/bash

# Notification System Deployment Script
# This script helps you set up and deploy your notification system

set -e

echo "🔔 Notification System Deployment Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists git; then
    print_error "Git is not installed. Please install git first."
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "All prerequisites are installed"
echo ""

# Step 2: Check Firebase CLI
print_info "Checking Firebase CLI..."

if ! command_exists firebase; then
    print_warning "Firebase CLI not found. Installing..."
    npm install -g firebase-tools
    print_success "Firebase CLI installed"
else
    print_success "Firebase CLI is installed"
fi
echo ""

# Step 3: Firebase login
print_info "Logging into Firebase..."
print_warning "A browser window will open. Please log in with your Google account."
firebase login

print_success "Logged into Firebase"
echo ""

# Step 4: Initialize Firebase
print_info "Initializing Firebase..."

if [ ! -f "firebase.json" ]; then
    print_warning "Running Firebase initialization..."
    firebase init
else
    print_success "Firebase already initialized"
fi
echo ""

# Step 5: Get Firebase project info
print_info "Getting Firebase project information..."
PROJECT_ID=$(firebase projects:list --json | grep -o '"projectId":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    print_error "Could not get Firebase project ID"
    exit 1
fi

print_success "Using Firebase project: $PROJECT_ID"
echo ""

# Step 6: Deploy Cloud Functions
print_info "Deploying Cloud Functions..."

if [ -d "functions" ]; then
    cd functions
    
    if [ ! -d "node_modules" ]; then
        print_info "Installing function dependencies..."
        npm install
    fi
    
    cd ..
    
    firebase deploy --only functions
    print_success "Cloud Functions deployed successfully"
else
    print_warning "Functions directory not found. Skipping function deployment."
fi
echo ""

# Step 7: Get function URLs
print_info "Getting Cloud Function URLs..."
REGION="us-central1"  # Default region
BASE_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net"

echo ""
echo "Your Cloud Function URLs:"
echo "----------------------------------------"
echo "sendTestNotification: ${BASE_URL}/sendTestNotification"
echo "sendToAllUsers: ${BASE_URL}/sendToAllUsers"
echo "----------------------------------------"
echo ""

print_warning "Please update these URLs in your app.js file!"
echo ""

# Step 8: GitHub setup
print_info "GitHub Repository Setup"
echo "Have you created a GitHub repository for this project? (y/n)"
read -r HAS_REPO

if [ "$HAS_REPO" = "y" ] || [ "$HAS_REPO" = "Y" ]; then
    echo "Enter your GitHub repository URL (e.g., https://github.com/username/repo.git):"
    read -r GITHUB_URL
    
    if [ ! -d ".git" ]; then
        git init
        git add .
        git commit -m "Initial commit - notification system"
        git branch -M main
        git remote add origin "$GITHUB_URL"
        git push -u origin main
        
        print_success "Code pushed to GitHub"
        
        # Extract username and repo name
        GITHUB_USER=$(echo "$GITHUB_URL" | sed -n 's/.*github.com[:/]\([^/]*\)\/.*/\1/p')
        REPO_NAME=$(echo "$GITHUB_URL" | sed -n 's/.*\/\([^/]*\)\.git/\1/p')
        
        echo ""
        print_info "Enable GitHub Pages:"
        echo "1. Go to: https://github.com/$GITHUB_USER/$REPO_NAME/settings/pages"
        echo "2. Under 'Source', select 'main' branch"
        echo "3. Click 'Save'"
        echo "4. Your site will be live at: https://$GITHUB_USER.github.io/$REPO_NAME/"
        echo ""
    else
        print_warning "Git repository already initialized"
    fi
else
    print_warning "Please create a GitHub repository and push your code manually"
    echo ""
    echo "Commands to run:"
    echo "  git init"
    echo "  git add ."
    echo "  git commit -m 'Initial commit'"
    echo "  git branch -M main"
    echo "  git remote add origin YOUR_REPO_URL"
    echo "  git push -u origin main"
fi
echo ""

# Step 9: Configuration checklist
print_info "Configuration Checklist"
echo "----------------------------------------"
echo "Make sure you've updated these files:"
echo ""
echo "1. firebase-config.js"
echo "   - apiKey"
echo "   - authDomain"
echo "   - projectId"
echo "   - storageBucket"
echo "   - messagingSenderId"
echo "   - appId"
echo ""
echo "2. firebase-messaging-sw.js"
echo "   - Same Firebase config as above"
echo ""
echo "3. app.js"
echo "   - VAPID key (line ~164 and ~171)"
echo "   - Cloud Function URLs (lines ~225 and ~261)"
echo ""
echo "4. functions/index.js"
echo "   - Your website URL (for email links)"
echo ""
echo "5. Firebase Console"
echo "   - Enable Firestore Database"
echo "   - Install 'Trigger Email' extension"
echo "   - Configure SMTP settings"
echo "----------------------------------------"
echo ""

# Step 10: Testing
print_info "Testing Checklist"
echo "----------------------------------------"
echo "After deployment, test the following:"
echo ""
echo "1. Visit your GitHub Pages URL"
echo "2. Enable push notifications"
echo "3. Subscribe to email notifications"
echo "4. Send test push notification"
echo "5. Send test email"
echo "6. Try 'Send to All Users' feature"
echo "----------------------------------------"
echo ""

# Summary
print_success "Deployment script completed!"
echo ""
print_info "Next Steps:"
echo "1. Update all configuration files (see checklist above)"
echo "2. Push changes to GitHub: git push origin main"
echo "3. Enable GitHub Pages in repository settings"
echo "4. Test your notification system"
echo ""
print_info "For detailed instructions, see SETUP_GUIDE.md"
echo ""

print_success "Good luck! 🚀"
