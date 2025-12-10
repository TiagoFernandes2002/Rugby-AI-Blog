#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Deployment script to be run on the EC2 instance.
# - Pulls latest code
# - Logs in to ECR
# - Pulls latest backend/frontend images
# - Restarts services via docker-compose
#
# Usage (on EC2, as ec2-user):
#   chmod +x infra/scripts/deploy.sh
#   ./infra/scripts/deploy.sh
# ---------------------------------------------------------------------------

APP_DIR="/home/ec2-user/rugby-blog"

# Adjust these if you ever move the images / region:
AWS_REGION="eu-west-1"
ECR_ACCOUNT_ID="359373591800"   # replace if you fork this repo
ECR_REGISTRY="${ECR_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo ">>> Changing to app dir: ${APP_DIR}"
cd "${APP_DIR}"

echo ">>> Pulling latest git changes..."
git pull --rebase

echo ">>> Logging into Amazon ECR..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo ">>> Pulling latest images via docker-compose..."
docker-compose pull

echo ">>> Starting / restarting containers..."
docker-compose up -d

echo ">>> Cleaning old images..."
docker image prune -f || true

echo ">>> Deploy complete."
