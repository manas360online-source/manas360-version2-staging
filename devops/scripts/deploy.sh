#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-/var/www/manas360}"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
TARGET_REMOTE="${TARGET_REMOTE:-origin}"
BRANCH_NAME="${BRANCH_NAME:-develop}"

resolve_remote_ref() {
	local remote="$1"
	local branch="$2"
	if git ls-remote --exit-code --heads "$remote" "$branch" >/dev/null 2>&1; then
		echo "$branch"
		return 0
	fi

	for fallback in main master develop; do
		if git ls-remote --exit-code --heads "$remote" "$fallback" >/dev/null 2>&1; then
			echo "$fallback"
			return 0
		fi
	done

	echo ""
}

cd "$ROOT_DIR"
git fetch "$TARGET_REMOTE" --prune

DEPLOY_BRANCH="$(resolve_remote_ref "$TARGET_REMOTE" "$BRANCH_NAME")"
if [ -z "$DEPLOY_BRANCH" ]; then
	echo "No deployable branch found on remote '$TARGET_REMOTE'"
	exit 1
fi

git checkout "$DEPLOY_BRANCH" || git checkout -b "$DEPLOY_BRANCH" "$TARGET_REMOTE/$DEPLOY_BRANCH"
git reset --hard "$TARGET_REMOTE/$DEPLOY_BRANCH"

cd "$BACKEND_DIR"
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build

cd "$FRONTEND_DIR"
npm ci
npm run build

pm2 restart manas360-backend || pm2 start "$BACKEND_DIR/dist/server.js" --name manas360-backend --time --log /var/log/backend.log
pm2 save
sudo nginx -t
sudo systemctl reload nginx

echo "Staging deployment completed successfully."
