FROM ubuntu:24.04

RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    sudo \
    jq \
    bc

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nodejs

# Install Claude Code
RUN npm install -g @anthropic-ai/claude-code

# Delete existing user with UID 1000, then create dev user
RUN userdel -r ubuntu 2>/dev/null || true && \
    useradd -m -s /bin/bash -u 1000 dev && \
    echo 'dev ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER dev
WORKDIR /workspace

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["bash"]