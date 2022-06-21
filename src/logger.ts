import * as vscode from 'vscode';

let extensionOutput: vscode.OutputChannel = vscode.window.createOutputChannel('Whylson-Connector');

export function info(msg: string, show: boolean = false) {
  extensionOutput.appendLine(msg);
  if (show) {
    extensionOutput.show();
  }
}

export function debug(msg: string) {
  extensionOutput.appendLine(`Debug: ${msg}`);
}
