#!/bin/bash
# Generate secure JWT secret for production use
# Usage: ./generate_jwt_secret.sh

echo "Generating secure JWT secret..."
SECRET=$(openssl rand -base64 32)
echo ""
echo "Your secure JWT secret:"
echo "$SECRET"
echo ""
echo "Add this to your docker-compose.yml environment:"
echo "  JWT_SECRET=$SECRET"
echo ""
echo "Or to your .env file:"
echo "JWT_SECRET=$SECRET"
