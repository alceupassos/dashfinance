#!/bin/bash
# Testar com um único cliente

echo "Ativando ambiente virtual..."
source venv/bin/activate

echo ""
echo "Executando teste com cliente único..."
echo ""
python automation/test_single_client.py

deactivate

