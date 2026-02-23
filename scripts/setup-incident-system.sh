#!/bin/bash

# Incident Reporting System - Setup Script
# This script automates the initial setup of the incident reporting system

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup
main() {
    print_header "Heartland Boys Home - Incident Reporting System Setup"
    echo ""
    
    # Check prerequisites
    print_info "Checking prerequisites..."
    echo ""
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js 20.x or higher."
        exit 1
    fi
    
    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm installed: $NPM_VERSION"
    else
        print_error "npm is not installed."
        exit 1
    fi
    
    # Check MongoDB
    if command_exists mongosh; then
        print_success "MongoDB Shell (mongosh) installed"
    else
        print_warning "MongoDB Shell (mongosh) not found. You'll need to install it or use MongoDB Atlas."
    fi
    
    echo ""
    print_header "Step 1: Install Dependencies"
    echo ""
    
    if [ -f "package.json" ]; then
        print_info "Installing npm packages..."
        npm install
        print_success "Dependencies installed"
    else
        print_error "package.json not found. Are you in the correct directory?"
        exit 1
    fi
    
    echo ""
    print_header "Step 2: Environment Configuration"
    echo ""
    
    if [ ! -f ".env" ]; then
        print_info "Creating .env file from template..."
        
        if [ -f ".env.incidents.example" ]; then
            cp .env.incidents.example .env
            print_success ".env file created"
            
            # Generate JWT secret
            print_info "Generating JWT secret..."
            JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
            
            # Generate encryption key
            print_info "Generating encryption master key..."
            ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
            
            # Update .env file
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" .env
                sed -i '' "s|ENCRYPTION_MASTER_KEY=.*|ENCRYPTION_MASTER_KEY=$ENCRYPTION_KEY|g" .env
            else
                # Linux
                sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" .env
                sed -i "s|ENCRYPTION_MASTER_KEY=.*|ENCRYPTION_MASTER_KEY=$ENCRYPTION_KEY|g" .env
            fi
            
            print_success "Security keys generated and saved to .env"
            print_warning "IMPORTANT: Keep your .env file secure and never commit it to version control!"
        else
            print_error ".env.incidents.example not found"
            exit 1
        fi
    else
        print_warning ".env file already exists. Skipping..."
    fi
    
    echo ""
    print_header "Step 3: Create Directories"
    echo ""
    
    print_info "Creating upload directories..."
    mkdir -p uploads/incidents
    mkdir -p uploads/temp
    mkdir -p backups
    mkdir -p logs
    
    chmod 755 uploads
    chmod 755 backups
    chmod 755 logs
    
    print_success "Directories created with correct permissions"
    
    echo ""
    print_header "Step 4: Database Setup"
    echo ""
    
    read -p "Do you want to set up the database now? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter MongoDB connection URI (or press Enter for default: mongodb://localhost:27017/heartland): " MONGO_URI
        MONGO_URI=${MONGO_URI:-mongodb://localhost:27017/heartland}
        
        print_info "Testing MongoDB connection..."
        if mongosh "$MONGO_URI" --eval "db.version()" >/dev/null 2>&1; then
            print_success "MongoDB connection successful"
            
            print_info "Running database migrations..."
            if [ -f "migrations/002_incident_reports.sql" ]; then
                mongosh "$MONGO_URI" < migrations/002_incident_reports.sql
                print_success "Database migrations completed"
            else
                print_warning "Migration file not found. You'll need to run migrations manually."
            fi
        else
            print_error "Could not connect to MongoDB. Please check your connection string."
            print_info "You can run migrations later with: mongosh \$MONGODB_URI < migrations/002_incident_reports.sql"
        fi
    else
        print_info "Skipping database setup. Remember to run migrations before starting the application."
    fi
    
    echo ""
    print_header "Step 5: Test Encryption"
    echo ""
    
    print_info "Testing encryption setup..."
    if node -e "
        const { encryptionService } = require('./server/utils/encryption');
        encryptionService.initialize(process.env.ENCRYPTION_MASTER_KEY || 'test-key-for-setup');
        const encrypted = encryptionService.encrypt('test');
        const decrypted = encryptionService.decrypt(encrypted);
        if (decrypted !== 'test') {
            console.error('Encryption test failed');
            process.exit(1);
        }
    " 2>/dev/null; then
        print_success "Encryption test passed"
    else
        print_warning "Encryption test failed. Check your ENCRYPTION_MASTER_KEY in .env"
    fi
    
    echo ""
    print_header "Step 6: Build Frontend"
    echo ""
    
    read -p "Do you want to build the frontend now? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Building frontend..."
        npm run build
        print_success "Frontend built successfully"
    else
        print_info "Skipping frontend build. Run 'npm run build' when ready."
    fi
    
    echo ""
    print_header "Setup Complete!"
    echo ""
    
    print_success "Incident Reporting System setup is complete!"
    echo ""
    print_info "Next steps:"
    echo "  1. Review and update .env file with your specific configuration"
    echo "  2. Create an admin user (see INCIDENT_SYSTEM_INSTALL.md)"
    echo "  3. Start the application:"
    echo "     - Development: npm run dev:full"
    echo "     - Production: npm run start"
    echo ""
    print_info "Documentation:"
    echo "  - Installation Guide: INCIDENT_SYSTEM_INSTALL.md"
    echo "  - User Guide: INCIDENT_REPORTING_SYSTEM.md"
    echo "  - Operations Runbook: INCIDENT_SYSTEM_RUNBOOK.md"
    echo ""
    print_warning "Security Reminders:"
    echo "  - Keep your .env file secure"
    echo "  - Change default admin password immediately"
    echo "  - Enable HTTPS in production"
    echo "  - Set up regular backups"
    echo "  - Review security settings in .env"
    echo ""
    
    read -p "Would you like to start the development server now? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Starting development server..."
        print_info "Frontend will be available at: http://localhost:8080"
        print_info "API will be available at: http://localhost:3000"
        print_info "Press Ctrl+C to stop the server"
        echo ""
        npm run dev:full
    else
        print_info "Setup complete. Start the server when ready with: npm run dev:full"
    fi
}

# Run main function
main

exit 0