#!/bin/bash

# EAS Build Automation Script for Android APK
# This script automates the entire build process

set -e

echo "=========================================="
echo "🚀 Freezy Prop Firm Trading App - APK Builder"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node -v)${NC}"
echo ""

# Navigate to frontend directory
cd frontend || { echo -e "${RED}❌ frontend directory not found!${NC}"; exit 1; }

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install || yarn install

echo ""
echo -e "${YELLOW}🔐 Logging into Expo...${NC}"
npm install -g eas-cli || yarn global add eas-cli

echo ""
echo -e "${YELLOW}📝 Starting EAS Build...${NC}"
echo "You will be prompted to:"
echo "1. Login with your Expo account (rudradev09)"
echo "2. Confirm the Android build"
echo ""

eas build --platform android --profile preview

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Build Complete!"
echo "==========================================${NC}"
echo ""
echo "Your APK will be ready soon."
echo "Check your build status at:"
echo "https://expo.dev/accounts/rudradev09/projects/frontend/builds"
echo ""
