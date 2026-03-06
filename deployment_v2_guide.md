# MANAS360 Deployment v2 Guide (AWS Lightsail)

This guide provides step-by-step instructions for deploying MANAS360 (backend and frontend) on AWS Lightsail, including DNS setup for manas360.com and www.manas360.com (BigRock).

---

## 1. Prepare Your Lightsail Instance

1. Log in to AWS Lightsail.
2. Create a new instance (Ubuntu recommended).
3. Choose instance plan and launch.
4. Note the public IP address.

---

## 2. Connect to Your Instance

- Use SSH from Lightsail console or:
  ```sh
  ssh ubuntu@<your-lightsail-ip>
  ```

---

## 3. Install Dependencies

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y git docker.io docker-compose nginx certbot python3-certbot-nginx
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 4. Clone Your Repo

```sh
cd ~
git clone https://github.com/manas360online-source/manas360-version2-staging.git manas360
cd manas360
```

---

## 5. Configure Environment Variables

- Copy your .env files for backend and frontend:
  - backend/.env
  - frontend/.env
- Edit as needed for production (DB, Redis, secrets, etc).

---

## 6. Set Up Docker Compose

- Use the provided docker-compose.yml or docker-compose.dev.yml.
- Edit as needed for production (ports, volumes, etc).

```sh
docker-compose up -d --build
```

---

## 7. Set Up Nginx (Reverse Proxy)

- Edit /etc/nginx/sites-available/default or create /etc/nginx/sites-available/manas360:

```nginx
server {
    listen 80;
    server_name manas360.com www.manas360.com;

    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- Enable config:
```sh
sudo ln -s /etc/nginx/sites-available/manas360 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. Set Up SSL (HTTPS)

```sh
sudo certbot --nginx -d manas360.com -d www.manas360.com
```

---

## 9. Set Up Systemd Service (Optional)

- For backend, create /etc/systemd/system/manas360-backend.service:

```ini
[Unit]
Description=MANAS360 Backend
After=docker.service

[Service]
WorkingDirectory=/home/ubuntu/manas360/backend
ExecStart=/usr/bin/docker-compose up
Restart=always
User=ubuntu

[Install]
WantedBy=multi-user.target
```

- Enable and start:
```sh
sudo systemctl enable manas360-backend
sudo systemctl start manas360-backend
```

---

## 10. DNS Setup (BigRock)

1. Log in to your BigRock account.
2. Go to DNS management for manas360.com.
3. Set A record for manas360.com and www.manas360.com to your Lightsail public IP.
4. Remove any old A records.
5. Wait for DNS propagation (can take up to 24 hours).

---

## 11. Verify Deployment

- Visit http://manas360.com and http://www.manas360.com
- Check HTTPS (SSL) is working.
- Test API endpoints and frontend.

---

## 12. Troubleshooting

- Check logs:
  - Docker: `docker-compose logs`
  - Nginx: `sudo journalctl -u nginx` or `sudo tail -f /var/log/nginx/error.log`
  - Systemd: `sudo journalctl -u manas360-backend`
- Restart services as needed.

---

## 13. Updates

- To deploy new code:
```sh
cd ~/manas360
git pull
sudo docker-compose up -d --build
```

---

## 14. Security

- Keep your system updated.
- Use strong secrets in .env files.
- Restrict SSH access.

---

# End of Guide
