#!/usr/bin/env bash
# Build amd64 Next.js image and push to ECR (repo: kpay/kpay-fe).
#
# BACKEND_ORIGIN is baked at build time (Next rewrite).
# If unset, auto-reads: terraform output -raw api_internal_origin
#   → typically http://api.kpay.staging.local:8756
# Override when needed:
#   export BACKEND_ORIGIN=http://backend:8756   # compose
#
# Usage:
#   ./scripts/push-ecr.sh [tag]
#   export AWS_REGION=ap-southeast-1          # optional
#   export NEXT_PUBLIC_APP_ENV=staging       # optional
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

resolve_backend_origin() {
  if [[ -n "${BACKEND_ORIGIN:-}" ]]; then
    printf '%s' "$BACKEND_ORIGIN"
    return 0
  fi
  local tf_dir
  tf_dir="$(cd "$(dirname "$0")/../../infra/terraform" && pwd)"
  if [[ -d "$tf_dir" ]] && command -v terraform >/dev/null 2>&1; then
    local origin
    origin="$(cd "$tf_dir" && terraform output -raw api_internal_origin 2>/dev/null || true)"
    if [[ -n "$origin" ]]; then
      echo "==> BACKEND_ORIGIN from terraform: ${origin}" >&2
      printf '%s' "$origin"
      return 0
    fi
  fi
  echo "ERROR: set BACKEND_ORIGIN (e.g. http://api.kpay.staging.local:8756)" >&2
  echo "  or run terraform apply so 'api_internal_origin' is available:" >&2
  echo "  export BACKEND_ORIGIN=\$(cd infra/terraform && terraform output -raw api_internal_origin)" >&2
  return 1
}

TAG="${1:-$(default_tag)}"
APP_ENV="${NEXT_PUBLIC_APP_ENV:-staging}"
REGION="${AWS_REGION:-ap-southeast-1}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)}"
if [[ -z "${ACCOUNT_ID}" || "${ACCOUNT_ID}" == "None" ]]; then
  echo "ERROR: set AWS_ACCOUNT_ID or configure AWS CLI (aws sts get-caller-identity)" >&2
  exit 1
fi
BACKEND_ORIGIN="$(resolve_backend_origin)"

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
