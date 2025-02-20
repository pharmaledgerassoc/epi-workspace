#!/bin/sh

# Define the path to the env.json file
ENV_FILE="./env.json"

# Extract domains from the JSON file
VAULT_DOMAIN=$(sed -n 's/.*"VAULT_DOMAIN": "\([^"]\+\)".*/\1/p' "$ENV_FILE")
EPI_SUBDOMAIN=$(sed -n 's/.*"EPI_SUBDOMAIN": "\([^"]\+\)".*/\1/p' "$ENV_FILE")

# Define the base directory for domain folders
BASE_DIR="/ePI-workspace/apihub-root/external-volume/domains"

# Create the main domains folder if it doesn't exist
mkdir -p "$BASE_DIR"

# Array of domains to process
domains="$VAULT_DOMAIN $EPI_SUBDOMAIN"

# Loop through each domain and create necessary subfolders
for domain in $domains; do
  domain_dir="$BASE_DIR/$domain"
  echo $domain
  # Create the main domain folder if it doesn't exist
  mkdir -p "$domain_dir"

  # Create the brick-storage and anchors subfolders
  mkdir -p "$domain_dir/brick-storage"
  mkdir -p "$domain_dir/anchors"
done

echo "Folders created successfully."