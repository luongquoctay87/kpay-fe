#!/usr/bin/env bash
# Build amd64 Next.js image and push to ECR (repo: kpay/kpay-fe).
#
# BACKEND_ORIGIN is baked at build time (Next rewrite) — required.
# Prefer Cloud Map origin from Terraform:
#   export BACKEND_ORIGIN=$(cd ../infra/terraform && terraform output -raw api_internal_origin)
# Compose network:
#   export BACKEND_ORIGIN=http://backend:8756
#
# Usage:
#   export AWS_ACCOUNT_ID=…
#   export BACKEND_ORIGIN=http://api.kpay.staging.local:8756
#   export AWS_REGION=ap-southeast-1          # optional
#   export NEXT_PUBLIC_APP_ENV=staging       # optional: staging|production (default staging)
#   ./scripts/push-ecr.sh [tag]
#
# Examples:
#   ./scripts/push-ecr.sh                 # tag = git short SHA + :latest
#   ./scripts/push-ecr.sh v1.0.0
#
# Pushes:
#   {registry}/kpay/kpay-fe:<tag>
#   {registry}/kpay/kpay-fe:latest   (when tag ≠ latest)

set -euo pipefail

default_tag() {
  if git rev-parse --short HEAD >/dev/null 2>&1; then
    git rev-parse --short HEAD
  else
    date +%Y%m%d%H%M%S
  fi
}

TAG="${1:-$(default_tag)}"
APP_ENV="${NEXT_PUBLIC_APP_ENV:-staging}"
REGION="${AWS_REGION:-ap-southeast-1}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)}"
if [[ -z "${ACCOUNT_ID}" || "${ACCOUNT_ID}" == "None" ]]; then
  echo "ERROR: set AWS_ACCOUNT_ID or configure AWS CLI (aws sts get-caller-identity)" >&2
  exit 1
fi
BACKEND_ORIGIN="${BACKEND_ORIGIN:?set BACKEND_ORIGIN (e.g. http://api.kpay.staging.local:8756)}"

REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_LOCAL="kpay/kpay-fe"
IMAGE_REMOTE="${REGISTRY}/kpay/kpay-fe"
REPO_NAME="kpay/kpay-fe"

cd "$(dirname "$0")/.."

echo "==> Building ${IMAGE_LOCAL}:${TAG}"
echo "    BACKEND_ORIGIN=${BACKEND_ORIGIN}"
echo "    NEXT_PUBLIC_APP_ENV=${APP_ENV}"

docker build \
  --platform=linux/amd64 \
  --build-arg "BACKEND_ORIGIN=${BACKEND_ORIGIN}" \
  --build-arg "NEXT_PUBLIC_APP_ENV=${APP_ENV}" \
  --build-arg "NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE:-/api}" \
  -t "${IMAGE_LOCAL}:${TAG}" \
  -t "${IMAGE_LOCAL}:latest" \
  .

echo "==> Login ECR ${REGISTRY}"
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}"

echo "==> Tag for ECR"
docker tag "${IMAGE_LOCAL}:${TAG}" "${IMAGE_REMOTE}:${TAG}"
docker tag "${IMAGE_LOCAL}:${TAG}" "${IMAGE_REMOTE}:latest"

echo "==> Push ${IMAGE_REMOTE}:${TAG}"
docker push "${IMAGE_REMOTE}:${TAG}"

if [[ "${TAG}" != "latest" ]]; then
  echo "==> Push ${IMAGE_REMOTE}:latest"
  docker push "${IMAGE_REMOTE}:latest"
else
  echo "==> TAG is 'latest' — skipped duplicate push (pass a version/SHA as \$1 to get two tags)"
fi

echo "==> Verify tags on ECR"
aws ecr describe-images \
  --region "${REGION}" \
  --repository-name "${REPO_NAME}" \
  --image-ids imageTag="${TAG}" \
  --query 'imageDetails[0].{tags:imageTags,pushed:imagePushedAt,digest:imageDigest}' \
  --output table

echo "==> Done"
echo "    ${IMAGE_REMOTE}:${TAG}"
if [[ "${TAG}" != "latest" ]]; then
  echo "    ${IMAGE_REMOTE}:latest"
fi
