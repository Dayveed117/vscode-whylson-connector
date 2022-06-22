import * as vscode from 'vscode';

/**
 * Simple logger class to help extension debugging
 * and providing information for users.
 */

const separator = "-----";

export class WhylsonLogger {

  private _mode: vscode.ExtensionMode;
  private _extensionOutput: vscode.OutputChannel;

  /**
   * Create a WhylsonLogger instance.
   * @param context `vscode.ExtensionContext`
   */
  constructor(context: vscode.ExtensionContext) {
    this._mode = context.extensionMode;
    this._extensionOutput = vscode.window.createOutputChannel("Whylson-Connector");
  }

  /**
   * Send a message to output channel.
   * @param msg `string` The message to be displayed.
   * @param show `boolean` Bring output channel to focus.
   */
  public info(msg: string, show: boolean = false) {
    this._extensionOutput.appendLine(`${separator}\nINFO: ${msg}`);
    if (show) {
      this._extensionOutput.show();
    }
  }

  /**
   * Send a message to output channel.
   * Debug messages seen in every environment but production.
   * @param msg `string` The message to be displayed.
   * @param show `boolean` Bring output channel to focus.
   */
  public debug(msg: string, show: boolean = false) {
    if (this._mode !== vscode.ExtensionMode.Production) {
      this._extensionOutput.appendLine(`DEBUG: ${msg}`);
      if (show) {
        this._extensionOutput.show();
      }
    }
  }

  /**
   * Release resources associated with WhylsonLogger.
   */
  public dispose() {
    this._extensionOutput.dispose();
  }

}
