#!/bin/bash
set -e

echo "🐳 Instalando Docker nativo para CachyOS/Arch Linux..."
sudo pacman -S --noconfirm docker docker-compose

echo "🔧 Habilitando el servicio y añadiendo usuario al grupo docker..."
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

echo "🚀 Levantando MeteoPrecisa con Docker Compose..."
sudo -E su -p $USER -c "docker compose up --build -d"

echo "✅ Listo. Ya puedes probar los endpoints locales."
