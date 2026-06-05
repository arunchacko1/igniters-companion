#!/usr/bin/env bash
# One-time setup for an Amazon Linux 2023 t3.micro to run Igniters Companion.
# Run once, then log out and back in so the docker group takes effect.
set -euo pipefail

# 1. 2GB swap — the embeddings model is loaded in-process and 1GB of RAM is not
#    enough headroom under load. Swap keeps the box from OOM-killing the app.
if [ ! -f /swapfile ]; then
  sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 2. Docker engine.
sudo dnf -y install docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# 3. Docker Compose v2 as a CLI plugin.
DOCKER_PLUGINS=/usr/local/lib/docker/cli-plugins
sudo mkdir -p "$DOCKER_PLUGINS"
sudo curl -SL \
  https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o "$DOCKER_PLUGINS/docker-compose"
sudo chmod +x "$DOCKER_PLUGINS/docker-compose"

# 4. psql client, used once to apply the database schema to RDS.
sudo dnf -y install postgresql15

# 5. App directory where docker-compose.prod.yml and .env will live.
mkdir -p ~/igniters

echo
echo "Bootstrap complete. Log out and back in for docker group membership, then:"
echo "  1. Copy docker-compose.prod.yml and a filled-in .env into ~/igniters"
echo "  2. Apply the schema:  psql \"\$DATABASE_URL\" -f schema.sql"
echo "  3. Start it:          cd ~/igniters && docker compose -f docker-compose.prod.yml up -d"
