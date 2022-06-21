import { execSync } from 'child_process';
import * as vscode from 'vscode';


export namespace ligo {

  /**
   * Verifies if ligo executable is found within the sytem
   * @returns `true` if ligo executable is found, `false` otherwise
   */
  export async function verifyLigoBinaries() {

    try {
      execSync("which ligo", { encoding: "utf-8" });
      return true;
    } catch (error) {
      return false;
    }
  }
}
