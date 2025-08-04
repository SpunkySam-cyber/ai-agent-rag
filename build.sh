
# Bring pip/build tooling up to date so packages can generate metadata
python3 -m pip install --upgrade pip setuptools wheel

# Install Python dependencies
pip3 install -r python-requirements.txt

# Build the application (frontend + bundle)
npm run build
