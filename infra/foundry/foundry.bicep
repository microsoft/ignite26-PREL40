targetScope = 'resourceGroup'

@minLength(1)
@description('Azure region for the resource group and AI Foundry resources. The region must support the selected model.')
param location string = resourceGroup().location

@minLength(1)
@description('Name of the AI model and its deployment.')
param modelName string = 'gpt-6-luna'

@minLength(1)
@description('Version of the AI model to deploy.')
param modelVersion string = '2026-09-22'

@minLength(1)
@description('Format of the AI model to deploy.')
param modelFormat string = 'OpenAI'

@minValue(1)
@description('Capacity of the model deployment.')
param capacity int = 50

@minLength(1)
@description('SKU of the model deployment.')
param sku string = 'GlobalStandard'

var resourceToken = uniqueString(subscription().id, resourceGroup().name, location)

module aiFoundry 'br/public:avm/ptn/ai-ml/ai-foundry:0.7.0' = {
  name: 'aiFoundry'
  params: {
    baseName: substring(resourceToken, 0, 12)
    location: location
    aiFoundryConfiguration: {
      disableLocalAuth: false
    }
    aiModelDeployments: [
      {
        name: modelName
        model: {
          format: modelFormat
          name: modelName
          version: modelVersion
        }
        sku: {
          capacity: capacity
          name: sku
        }
      }
    ]
  }
}

output AZURE_RESOURCE_GROUP string = resourceGroup().name
output AZURE_AI_FOUNDRY_NAME string = aiFoundry.outputs.aiServicesName
output AZURE_AI_FOUNDRY_PROJECT_NAME string = aiFoundry.outputs.aiProjectName
output AZURE_AI_MODEL string = modelName
