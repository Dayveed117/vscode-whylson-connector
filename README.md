# Whylson-Connector README

This is the README for Whylson-Connector, a VS Code extension enabling formal verification of LIGO smart contracts through the use of WhylSon tool, based on Why3.

![usage gif](/resources/features1.gif)

## Features

+ On-the-fly compilation of LIGO files through customizable settings in contracts.json;
+ Dual-View of LIGO and Michelson files, changes on LIGO files can be reflected in this panel, as well as LIGO compiler errors when compilation is not successful.
+ Snippets for WhylSon specifications in LIGO files;
+ Formal verification of Michelson smart contracts through WhylSon.

## Requirements

To enable the extension's full capabilities, the following is required:

+ VS Code instance being in a workspace environment;
+ LIGO compiler present in the system's PATH;
+ An installation of WhylSon at the root of the LIGO project;
+ **ligo-vscode extension installed between versions 0.4.16-0.4.18**.

## Instalation & Usage (Pre-Release, Pre-Publish)

+ **Download project** into local machine;
+ Run `npm install` in terminal to install dependencies;
+ Install `ligo-vscode` extension, **downgrade its version into 0.4.16~0.4.18**;
+ Run the `Launch Extension` target in the Debug View. This will:
	+ Start a task `npm: watch` to compile the code;
	+ Run the extension in a new VS Code window.
+ In the newly open window, if not opened already, **open a folder or workspace**;
+ Open or create a LIGO file;
+ The extension is now active, enabling the user to use its features.

## Extension Commands

This extension adds the following commands to the context:

+ `Save Contract` : Attempts to make an entry for the current LIGO contract in `.whylson/contracts.json`. Making an entry requires a successful compilation of the LIGO document;
+ `Start Whylson Session` : Starts a new process in which Whylson runs a session with the Michelson file, found within `.whylson/contracts/`, of the active LIGO file on screen;
+ `Open Michelson View` : Opens Michelson file of respective LIGO document. If contract is not found within `.whylson/contracts/`, attempts to create a new entry for it, opening the view if successful. **This command is also available through an icon on the editor title UI**;
+ `Erase Contract Data` : Erases the contract data for the active LIGO document in `.whylson/contracts/` and `.whylson/contracts.json`;
+ `Remake .whylson Folder` : Erases all contents of `.whylson/` folder.

## Extension Configuration

+ `whylson-connector.autoSave` : Toggle autosave feature. If on, **and Michelson view of respective LIGO file is visible**, the latter is automatically saved after the specified time interval in `autoSaveThreshold`, triggering compilation;
+ `whylson-connector.autoSaveThreshold` : Throttled time interval for auto saving;
+ `whylson-connector.onSaveBackgroundCompilation` : Attempts to compile LIGO document even if view is not visible;
+ `whylson-connector.highlightAnnotations` : Highlight whylson annotated lines in LIGO documents;
+ `whylson-connector.showOutputMessages` : Have extension occasionally send messages on Whylson-Connector output channel.

## Known Issues

+ `whylson-connector.showOutputMessages` and `whylson-connector.highlightAnnotations` configurations are undergoing development, not taking any effect on the extension yet;
+ LIGO comment attribute still under development, being unable for annotations to be carried over to Michelson;
+ WhylSon is undergoing development, and is unable to be launched at this moment in time.

---
