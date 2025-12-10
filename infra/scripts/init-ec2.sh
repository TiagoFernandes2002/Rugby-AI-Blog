#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# One-time bootstrap script for a fresh Amazon Linux EC2 instance.
# - Installs Docker, docker-compose, git and AWS CLI
# - Clones / updates this repository
#
# Run on the EC2 box as ec2-user:
#   chmod +x infra/scripts/init-ec2.sh
#   ./infra/scripts/init-ec2.sh
# ---------------------------------------------------------------------------

APP_DIR="/home/ec2-user/rugby-blog"
REPO_URL="https://github.com/TiagoFernandes2002/Rugby-AI-Blog.git"

echo ">>> Updating system packages..."
sudo dnf update -y || sudo yum update -y

echo ">>> Installing git, Docker and AWS CLI..."
sudo dnf install -y git docker awscli || sudo yum install -y git docker awscli

echo ">>> Installing docker-compose (standalone binary)..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.31.0/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo ">>> Enabling and starting Docker..."
sudo systemctl enable docker
sudo systemctl start docker

echo ">>> Adding ec2-user to docker group (you may need to log out and back in)..."
sudo usermod -aG docker ec2-user || true

echo ">>> Creating application directory at ${APP_DIR}..."
sudo mkdir -p "${APP_DIR}"
sudo chown ec2-user:ec2-user "${APP_DIR}"

if [ ! -d "${APP_DIR}/.git" ]; then
  echo ">>> Cloning repository..."
  git clone "${REPO_URL}" "${APP_DIR}"
else
  echo ">>> Repository already exists, pulling latest changes..."
  cd "${APP_DIR}"
  git pull --rebase
fi

cat <<EOF

>>> Init complete.

Next steps on the EC2 instance:

1. Create backend/.env with your real keys:

   cd ${APP_DIR}/backend
   nano .env

   PORT=4000
   HF_ACCESS_TOKEN=your-hf-token
   API_RUGBY_KEY=your-api-sports-key

2. Create frontend/.env.production (or .env for local dev) with:

   VITE_API_URL=http://<ec2-public-ip>:4000

3. Then use infra/scripts/deploy.sh to deploy/update containers.

EOF
