# Deployment Guide - Messaging Frontend

Ce guide détaille le déploiement de l'application **messaging_frontend** sur un serveur AWS Lightsail existant (où d'autres frontends sont déjà déployés).

## Prérequis

Le serveur doit déjà avoir :
- Ubuntu 22.04 LTS
- Node.js 20.x
- PM2 installé globalement
- Nginx configuré
- Certbot pour SSL

Vous aurez besoin de :
- Accès SSH au serveur
- Accès au repository GitHub
- Un sous-domaine dédié (ex: `flow.nodes-hub.com`)

---

## 1) Se connecter au serveur

```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_INSTANCE_IP
```

---

## 2) Créer un utilisateur dédié (recommandé)

```bash
sudo adduser messaging
sudo usermod -aG sudo messaging
su - messaging
```

---

## 3) Cloner le projet

```bash
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/VOTRE_ORG/messaging_frontend.git messaging_frontend
cd messaging_frontend
```

---

## 4) Variables d'environnement

Créer `.env.local` :

```bash
nano .env.local
```

Contenu minimal :

```env
NEXT_PUBLIC_API_URL=https://flowapi.nodes-hub.com
NODE_ENV=production
```

Sécuriser :

```bash
chmod 600 .env.local
```

---

## 5) Installer et builder

```bash
npm install
npm run build
```

---

## 6) Configurer PM2

Créer `ecosystem.config.js` :

```bash
nano ecosystem.config.js
```

Contenu :

```javascript
module.exports = {
  apps: [{
    name: 'messaging_frontend',
    script: 'npm',
    args: 'start',
    cwd: '/home/messaging/apps/messaging_frontend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

Créer les logs :

```bash
mkdir -p logs
```

Démarrer :

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

> **Important:** Exécute la commande `sudo` fournie par PM2 pour activer le démarrage automatique.

---

## 7) Configurer Nginx

Créer le site :

```bash
sudo nano /etc/nginx/sites-available/messaging
```

Contenu :

```nginx
server {
    listen 80;
    server_name flow.nodes-hub.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    client_max_body_size 50M;
}
```

Activer :

```bash
sudo ln -s /etc/nginx/sites-available/messaging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8) SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d flow.nodes-hub.com
```

Tester le renouvellement :

```bash
sudo certbot renew --dry-run
```

---

## 9) Vérification

```bash
pm2 status
pm2 logs messaging_frontend --lines 50
```

Accès final :

```
https://flow.nodes-hub.com
```

---

## Mise à jour rapide

```bash
su - messaging
cd ~/apps/messaging_frontend
git pull
npm install
npm run build
pm2 restart messaging_frontend
```

---

## Troubleshooting rapide

```bash
pm2 logs messaging_frontend --lines 100
sudo tail -f /var/log/nginx/error.log
sudo lsof -i :3002
```
