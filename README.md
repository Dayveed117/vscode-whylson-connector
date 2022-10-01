# Whylson-Connector README

This is the README for Whylson-Connector, a VSCode extension enabling formal verification of LIGO smart contracts through the use of Whylson tool, based on Why3.

## Features

+ On-the-fly compilation of LIGO files through customizable settings in contracts.json;
+ Dual-View of LIGO and Michelson files, changes on LIGO files can be reflected in this panel, as well as LIGO compiler errors when compilation is not successful.
+ Snippets for WhylSon specifications in LIGO files;

## Requirements

For the full experience of this extension, the following is required:

+ VSCode instance being in a workspace environment;
+ LIGO compiler present in the system's PATH;
+ An installation of WhylSon at the root of the LIGO project;
+ ligo-vscode extension installed between versions 0.4.16-0.4.18.

## Extension Commands

This extension adds the following commands to the context :

+ `Save Contract` : Attempts to make an entry for the current LIGO contract in `.whylson/contracts.json`. Making an entry requires a successful compilation of the LIGO document;
+ `Start Whylson Session` : Starts a new process in which Whylson runs a session with the Michelson file, found within `.whylson/contracts/`, of the active LIGO file on screen;
+ `Open Michelson View` : Opens Michelson file of respective LIGO document. If contract is not found within `.whylson/contracts/`, attempts to create a new entry for it, opening the view if successful;
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
+ Whylson's is undergoing development, and is unable to be launched at this moment in time.

---
