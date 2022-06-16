import { execSync } from 'child_process';
import * as vscode from 'vscode';


interface CompileContractOptions {
  inPath: string
  entrypoint: string
  outPath: string
  flags?: Map<string, string>
}

/**
 * Verifies if current focused file is ligo language.
 * @param e vscode.TextEditor : The active editor for vscode instance
 * @returns True if active editor is a ligo file, false otherwise
 */
export function isLigoFileDetected(e: vscode.TextEditor | undefined): boolean {
  if (!e) {
    console.log("No active editor!");
    return false;
  }
  return !!e.document.languageId.match(/^(m|js|re)?ligo$/g);
}

/**
 * Verifies if ligo-vscode is installed and active
 */
export function isLigoExtensionActive(): boolean {
  const a = vscode.extensions.getExtension("ligolang-publish.ligo-vscode");
  return (!!a && a.isActive);
}

/**
 * Compiles the active ligo document using a set of options
 * @param cco `CompileContractOptions` : Set of options added for ligo compilation
 * @returns `true` if compilation is successful, `false` otherwise
 */
// ! This function might be overhauled by an API call to ligo extension
// * Function shoudl eventually accept configurations paramters
export function compileActiveLigo(cco: CompileContractOptions) {

  try {
    let flags: string = "";
    cco.flags?.forEach( (v,k) => {
      flags += `${k} ${v} `;
    });

    let command = `ligo compile contract ${cco.inPath} -e ${cco.entrypoint} -o ${cco.outPath} ${flags}`.trimEnd();
    console.log(command);

    execSync(command, {encoding: "utf-8"});
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verifies if ligo executable is found within the sytem
 * @returns `true` if ligo executable is found, `false` otherwise
 */
export async function verifyLigoBinaries() {

  try {
    execSync("which ligo", {encoding: "utf-8"});
    return true;
  } catch (error) {
    return false;
  }
}
