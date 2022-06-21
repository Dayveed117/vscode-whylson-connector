import * as vscode from 'vscode';
import { WhylsonContext } from './whylson-context';

// Method called when extension is activated
export function activate(context: vscode.ExtensionContext) {

  // --------------------------------------------------- //
  //                     DECLARATIONS                    //
  // --------------------------------------------------  //

  // Test WhylsonContext object
  const whylsonContext = new WhylsonContext(context);

  setTimeout(() => {
    whylsonContext.activate();
  }, 100);

  // TODO : Requires MEGA refactoring
  // const checkLigo = () => {
  //   const a = WhylsonContext.isLigoExtensionActive();
  //   const b = WhylsonContext.isLigoFileDetected(vscode.window.activeTextEditor);
  //   const c = ligo.verifyLigoBinaries();

  //   if (!a) {
  //     vscode.window.showWarningMessage("Please install or activate \"ligo-vscode\" extension!");
  //   } else if (!b) {
  //     vscode.window.showWarningMessage("No ligo file active!");
  //   } else if (!c) {
  //     vscode.window.showWarningMessage("LIGO not found in the system.");
  //   } else {
  //     vscode.window.showInformationMessage("Extension ready to proceed!");
  //   }
  //   return a && b && c;
  // };

  // // ! Requires MEGA refactoring
  // const openContract = () => {
  //   const isCompiled = WhylsonContext._compileActiveLigo(vscode.window.activeTextEditor!, {
  //     entrypoint: "main",
  //     onPath: vscode.window.activeTextEditor!.document.uri!.path,
  //     flags: []
  //   });

  //   if (isCompiled) {
  //     vscode.window.showTextDocument(
  //       vscode.Uri.parse(vscode.window.activeTextEditor?.document.fileName!.concat(".tz")!),
  //       { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true, preview: true }
  //     );
  //   }
  // };

  // Initial Invocation
  // setTimeout(() => {
  //   if (checkLigo()) {
  //     openContract();
  //   }
  // }, 100);

  // --------------------------------------------- //
  //                     EVENTS                    //
  // --------------------------------------------- //

  // Refresh contract each time ligo source is saved
  // context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => {
  //   if (!WhylsonContext.isLigoFileDetected(vscode.window.activeTextEditor)) {
  //     return;
  //   }
  //   openContract();
  // }));

  // Command that checks if a file is ligo
  // context.subscriptions.push(vscode.commands.registerCommand('whylson-connector.check-ligo', () => {
  //   if (checkLigo()) {
  //     openContract();
  //   }
  // }));

  // Command that starts the whylson session for the current contract
  // context.subscriptions.push(vscode.commands.registerCommand('whylson-connector.start-session', async () => {
  //   whylsonContext.activate();
  //   vscode.window.showErrorMessage("Command not implemented.");
  // }));
}

// Method called when extension is deactivated
export function deactivate() { }
