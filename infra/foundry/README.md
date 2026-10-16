# Microsoft Foundry deployment

`foundry.bicep` is the source for the Microsoft Foundry template used in Skillable. It creates a Foundry project with a single AI model deployment.

## Prepare the Skillable template

Compile the Bicep source to JSON with the Bicep CLI before uploading it to Skillable:

```bash
bicep build foundry.bicep --outfile foundry.json
```

Upload the generated `foundry.json` file to Skillable.

## Deploy outside Skillable

Sign in with the Azure CLI, create a resource group in a region that supports the selected model, and deploy the Bicep file:

```bash
az login
az account set --subscription "<subscription-id>"
az group create --name "<resource-group>" --location "<azure-region>"
az deployment group create \
  --resource-group "<resource-group>" \
  --template-file foundry.bicep \
  --parameters location="<azure-region>"
```

Override `modelName`, `modelVersion`, `modelFormat`, `capacity`, or `sku` with additional `--parameters` values when needed.
