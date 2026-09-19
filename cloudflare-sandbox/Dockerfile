# Base image ships the sandbox control server plus Node, Bun and Python.
# The tag MUST match the @cloudflare/sandbox version in package.json.
FROM docker.io/cloudflare/sandbox:0.12.9

ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=1

# Pre-scaffold the Next.js + shadcn project into the image. This is the
# Cloudflare equivalent of the old e2b-templates/nextjs template: baking it in
# means a fresh sandbox boots with the project already installed instead of
# running create-next-app on every cold start.
RUN mkdir -p /home/user/project \
  && cd /home/user/project \
  && npx --yes create-next-app@16.3.4 . --yes \
  && npx --yes shadcn@4.21.0 init --silent --defaults \
  && npx --yes shadcn@4.21.0 add --all --yes \
  && mkdir -p /home/user/project/public/assets/unsplash

# Required so `wrangler dev` can reach the dev server through a preview URL.
EXPOSE 3001
