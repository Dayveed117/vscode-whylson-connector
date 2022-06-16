import * as path from 'path';
import * as vscode from 'vscode';
import { compileActiveLigo, isLigoFileDetected, isLigoExtensionActive, verifyLigoBinaries } from './utils';

// Method called when extension is activated
export function activate(context: vscode.ExtensionContext) {

  // --------------------------------------------------- //
  //                     DECLARATIONS                    //
  // -------------------------------------------------- //

  // ! Requires MEGA refactoring
  const checkLigo = () => {
    const a = isLigoExtensionActive();
    const b = isLigoFileDetected(vscode.window.activeTextEditor);
    const c = verifyLigoBinaries();

    if (!a) {
      vscode.window.showWarningMessage("Please install or activate \"ligo-vscode\" extension!");
    } else if (!b) {
      vscode.window.showWarningMessage("No ligo file active!");
    } else if (!c) {
        vscode.window.showWarningMessage("LIGO not found in the system.");
    } else {
      vscode.window.showInformationMessage("Extension ready to proceed!");
    }
    return a && b && c;
  };

  // ! Requires MEGA refactoring
  const openContract = () => {
    const isCompiled = compileActiveLigo({
      inPath: vscode.window.activeTextEditor?.document.fileName!,
      entrypoint: "main",
      outPath: vscode.window.activeTextEditor?.document.fileName!.concat(".tz")!,
      flags: new Map<string, string>([
        ["--michelson-comments", "location"]
      ])
    });

    if (isCompiled) {
      // * open contents of contract
    }
  };

  // Initial Invocation
  setTimeout(() => {
    if (checkLigo()) {
      openContract();
    }
  }, 100);

  // --------------------------------------------- //
  //                     EVENTS                    //
  // --------------------------------------------- //

  // Command that checks if a file is ligo
  context.subscriptions.push(vscode.commands.registerCommand('whylson-connector.check-ligo', () => {
    if (checkLigo()) {
      openContract();
    }
  }));

  // Command that starts the whylson session for the current contract
  context.subscriptions.push(vscode.commands.registerCommand('whylson-connector.start-session', () => {
    vscode.window.showErrorMessage("Not yet implemented!");
  }));
}

// Method called when extension is deactivated
export function deactivate() {}
