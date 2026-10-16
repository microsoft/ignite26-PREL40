# PREL40: Build data-rich apps in Microsoft Fabric

4h lab focusing on Microsoft Fabric Apps (Rayfin) for Microsoft Ignite 2026 attendees. 

## Lab Agenda

- 45m | slides | Introduction and overview (Fabric, OneLake, Semantic Model, Rayfin)
- 60m | hands-on | part 1: setup tools, create semantic model on top of existing data
- 15m | break / catch-up
- 90m | hands-on | part 2: build and customize Rayfin app
- 15m | slides/walthrough | Review and wrap-up

Total: 3h45 + 15m of margin, time for folks to catch up etc

## Scenario
Home loan app service (Finance/banking)

## Data Preparation
- Data: 
  - Create SQL DB in Fabric and populate it with sample data
  - Create semantic model on top of the SQL DB
  - Create Rayfin app from prebuilt template
    * when needed, rayfin app generates the sample data on its own

## Features to be demonstrated
- Use Github Copilot App + rayfin plugin
- Demonstrate new Rayfin features:
  - RBAC
  - storage
  - semantic model connector
  - functions + secret store (=> AI model in Foundry)
  - monitoring, protected static content, app access
