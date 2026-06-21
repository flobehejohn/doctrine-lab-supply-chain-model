FROM alpine:3.20.3

LABEL org.opencontainers.image.title="doctrine-gitlab-local-sample"
LABEL org.opencontainers.image.description="Minimal sample image for Doctrine GitLab local supply chain lab"
LABEL org.opencontainers.image.version="0.1.0"

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY README.md /app/README.md

USER app

CMD ["sh", "-c", "echo doctrine-gitlab-local-sample && test -f /app/README.md"]
